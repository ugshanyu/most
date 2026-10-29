"""Compatibility entrypoint: publish the current packs, never resurrect classroom v1."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('publish-public-packs.py')),run_name='__main__')
