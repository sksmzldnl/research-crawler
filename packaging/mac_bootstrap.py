"""Offline entry point for the self-contained macOS application bundle."""
import sys
from pathlib import Path

resources = Path(__file__).resolve().parent
sys.path[:0] = [str(resources / "application"), str(resources / "packages")]

from zerowaste_listener.app import main

raise SystemExit(main())
