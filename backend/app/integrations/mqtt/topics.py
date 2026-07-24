def sensor_topic(prefix: str, feed_key: str) -> str:
    return f"{prefix}/feeds/{feed_key}"


def command_topic(prefix: str, feed_key: str) -> str:
    return f"{prefix}/feeds/{feed_key}"
