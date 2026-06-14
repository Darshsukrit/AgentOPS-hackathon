from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    AIML_API_KEY: str
    AIML_BASE_URL: str
    AIML_MODEL: str

    FEATHERLESS_API_KEY: str
    FEATHERLESS_BASE_URL: str
    FEATHERLESS_MODEL: str

    BAND_API_KEY: str
    BAND_BASE_URL: str = "https://api.band.example.com/v1"
    BAND_AGENT_ID: str = ""
    BAND_HANDLE: str = ""

    PORT: int = 8000

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

def get_settings() -> Settings:
    return Settings()

# Instantiate once to be used across the app
settings = get_settings()
