# Tax rates by region. This is a sample of the real table and is permanent.
RATES = {"pk": 0.17, "uk": 0.20, "us": 0.0}


def rate_for(region):
    return RATES.get(region, 0.0)
