"""Use the same conflict-protected La Source migration for Gold8."""
from importlib.util import spec_from_file_location,module_from_spec
from pathlib import Path
spec=spec_from_file_location('la_source',Path(__file__).with_name('apply-spa-gold7.py'))
module=module_from_spec(spec);spec.loader.exec_module(module)
if __name__=='__main__':module.apply('spa-gold8-2026.json','Gold8')
