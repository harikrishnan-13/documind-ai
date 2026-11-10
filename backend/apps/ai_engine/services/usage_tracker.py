import logging
import os
from decimal import Decimal, InvalidOperation

logger = logging.getLogger(__name__)


def extract_usage(response):
    """
    Extract token usage from an OpenAI Responses API response.
    """

    usage = getattr(response, "usage", None)

    if usage is None:
        return None

    input_tokens = getattr(usage, "input_tokens", 0) or 0
    output_tokens = getattr(usage, "output_tokens", 0) or 0
    total_tokens = getattr(usage, "total_tokens", 0) or 0

    input_details = getattr(
        usage, "input_tokens_details", None
    )

    cached_tokens = (
        getattr(input_details, "cached_tokens", 0) or 0
        if input_details
        else 0
    )

    return {
        "input_tokens": int(input_tokens),
        "output_tokens": int(output_tokens),
        "total_tokens": int(total_tokens),
        "cached_input_tokens": int(cached_tokens),
    }


def get_price_from_environment(variable_name):
    """
    Read an optional token price from environment variables.
    """

    value = os.getenv(variable_name, "").strip()

    if not value:
        return None

    try:
        price = Decimal(value)
    except InvalidOperation as exc:
        raise ValueError(
            f"Invalid pricing configuration: {variable_name}"
        ) from exc

    if price < 0:
        raise ValueError(
            f"{variable_name} cannot be negative."
        )

    return price


def calculate_estimated_cost(usage):
    """
    Estimate standard input/output token cost in USD.
    Prices are configured per one million tokens.
    """

    if usage is None:
        return None

    input_price = get_price_from_environment(
        "OPENAI_INPUT_PRICE_PER_MILLION_USD"
    )

    output_price = get_price_from_environment(
        "OPENAI_OUTPUT_PRICE_PER_MILLION_USD"
    )

    if input_price is None or output_price is None:
        return None

    input_cost = (
        Decimal(usage["input_tokens"])
        * input_price
        / Decimal("1000000")
    )

    output_cost = (
        Decimal(usage["output_tokens"])
        * output_price
        / Decimal("1000000")
    )

    total_cost = input_cost + output_cost

    return total_cost.quantize(Decimal("0.00000001"))


def log_token_usage(model, usage):
    """
    Log token consumption without logging user prompts or answers.
    """

    if usage is None:
        logger.info(
            "OpenAI usage information unavailable for model=%s",
            model,
        )
        return

    try:
        estimated_cost = calculate_estimated_cost(usage)

        if estimated_cost is None:
            cost_message = "not configured"
        else:
            cost_message = f"${estimated_cost}"

    except ValueError:
        logger.exception(
            "Invalid token pricing configuration."
        )
        cost_message = "unavailable due to invalid pricing"

    logger.info(
        (
            "OpenAI API usage | model=%s | input_tokens=%s | "
            "output_tokens=%s | total_tokens=%s | "
            "cached_input_tokens=%s | estimated_cost_usd=%s"
        ),
        model,
        usage["input_tokens"],
        usage["output_tokens"],
        usage["total_tokens"],
        usage["cached_input_tokens"],
        cost_message,
    )
