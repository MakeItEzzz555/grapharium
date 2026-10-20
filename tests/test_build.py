"""Regression checks for the read-only Graphify converter."""
import json
import pathlib
import tempfile
import unittest
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from build_viewer import normalize, build, script_safe

class BuilderTests(unittest.TestCase):
    def test_preserves_relation_and_provenance(self):
        raw=json.loads((ROOT/'examples/demo-graph.json').read_text())
        data=normalize(raw)
        self.assertEqual(len(data['n']),8)
        self.assertEqual(len(data['l']),8)
        self.assertEqual(data['l'][0]['relation'],'method')
        self.assertEqual(data['l'][0]['confidence'],'EXTRACTED')
        self.assertFalse(data['directed'])
        self.assertEqual(sum(g['count'] for g in data['g']),8)
    def test_refuses_duplicate_ids(self):
        with self.assertRaisesRegex(ValueError,'unique'):
            normalize({'nodes':[{'id':'x'},{'id':'x'}],'links':[]})
    def test_omits_unresolved_edges_without_making_links(self):
        result=normalize({'nodes':[{'id':'x'}],
            'links':[{'source':'x','target':'missing','relation':'contains'}]})
        self.assertEqual(result['dropped_links'],1)
        self.assertEqual(len(result['l']),0)
    def test_safe_script_embedding(self):
        result=script_safe('</script><img src=x onerror=alert(1)>&\u2028')
        self.assertNotIn('</script>',result)
        self.assertNotIn('<img',result)
        self.assertNotIn('&',result)
    def test_generates_self_contained_offline_folder(self):
        source=ROOT/'examples/demo-graph.json'
        before=source.read_bytes()
        with tempfile.TemporaryDirectory() as tmp:
            html=pathlib.Path(tmp)/'demo.html'
            data=build(source,html)
            result=html.read_text()
            self.assertTrue((html.parent/'three.min.js').exists())
            self.assertNotIn('/*GRAPH_DATA*/',result)
            self.assertNotIn('/*INLINE:',result)
            self.assertIn('Grapharium',result)
            self.assertEqual(len(data['n']),8)
        self.assertEqual(before,source.read_bytes())
    def test_refuses_overwrite_input(self):
        source=ROOT/'examples/demo-graph.json'
        with self.assertRaisesRegex(ValueError,'overwrite'):
            build(source,source)

if __name__=='__main__':
    unittest.main(verbosity=2)
