"""Processors for local text processing without LLM APIs."""

from klaros.processors.cleaner import CleanerService
from klaros.processors.privacy import PrivacyService
from klaros.processors.tagger import TaggerService

__all__ = [
    'CleanerService',
    'PrivacyService',
    'TaggerService',
]
