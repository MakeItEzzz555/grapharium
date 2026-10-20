#!/usr/bin/env python3
"""Build the offline viewer without modifying Graphify inputs or scanned sources."""
import argparse
import collections
import json
import pathlib
import shutil


def normalize(raw):
    if not isinstance(raw, dict) or not isinstance(raw.get('nodes'), list) or not isinstance(raw.get('links'), list):
        raise ValueError('Graphify input must contain nodes and links arrays')
    nodes, edges, index = [], [], {}
    for item in raw['nodes']:
        if not isinstance(item, dict):
            raise ValueError('Each node must be an object')
        ident = str(item.get('id', ''))
        if not ident or ident in index:
            raise ValueError('Node IDs must be nonempty and unique')
        index[ident] = len(nodes)
        nodes.append(dict(id=ident, label=str(item.get('label') or ident),
                          c=int(item.get('community') or 0), file=str(item.get('source_file') or ''),
                          loc=str(item.get('source_location') or ''), type=str(item.get('file_type') or ''),
                          klass=bool(item.get('_callable_class')), callable=bool(item.get('_callable')),
                          role=str(item.get('type') or item.get('node_kind') or ''),
                          community_name=str(item.get('community_name') or '')))
    dropped = 0
    for item in raw['links']:
        if not isinstance(item, dict):
            raise ValueError('Each link must be an object')
        ends = [item.get(k) for k in ('source', 'target')]
        ends = [index.get(str(x.get('id') if isinstance(x, dict) else x)) for x in ends]
        if None in ends:
            dropped += 1
            continue
        edges.append(dict(source=ends[0], target=ends[1], relation=str(item.get('relation') or 'related'),
                          confidence=str(item.get('confidence') or 'UNKNOWN'),
                          score=item.get('confidence_score'), weight=item.get('weight', 1),
                          file=str(item.get('source_file') or ''), loc=str(item.get('source_location') or '')))
    counts = collections.Counter(n['c'] for n in nodes)
    names = {n['c']: n['community_name'] for n in nodes if n['community_name']}
    between = collections.Counter()
    for edge in edges:
        a, b = (nodes[edge[k]]['c'] for k in ('source', 'target'))
        if a != b:
            between[tuple(sorted((a, b)))] += 1
    return dict(commit=str(raw.get('built_at_commit') or 'unknown'), directed=raw.get('directed') is True,
                n=nodes, l=edges, g=[dict(c=c, name=names.get(c, f'Community {c}'), count=count)
                                    for c, count in sorted(counts.items(), key=lambda x: (-x[1], x[0]))],
                gl=[[a, b, w] for (a, b), w in between.items()], dropped_links=dropped)


def script_safe(text):
    return text.replace('<', r'\u003c').replace('>', r'\u003e').replace('&', r'\u0026').replace('\u2028', r'\u2028').replace('\u2029', r'\u2029')


def build(source, target):
    root = pathlib.Path(__file__).resolve().parent
    if source.resolve() == target.resolve():
        raise ValueError('Output must not overwrite the input graph')
    payload = normalize(json.loads(source.read_text(encoding='utf-8')))
    html = (root / 'template.html').read_text(encoding='utf-8')
    assert html.count('/*GRAPH_DATA*/') == 1
    html = html.replace('/*GRAPH_DATA*/', 'const ALL = ' + script_safe(json.dumps(payload, ensure_ascii=False, separators=(',', ':'), allow_nan=False)) + ';')
    for name in ('hierarchy.js', 'universe.js', 'viewer.js'):
        marker = f'/*INLINE:{name}*/'
        if html.count(marker) != 1:
            raise ValueError(f'Missing or duplicate script marker: {name}')
        html = html.replace(marker, (root / name).read_text(encoding='utf-8'))
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(html, encoding='utf-8')
    # HTML is offline when kept alongside this pinned rendering dependency.
    library = target.parent / 'three.min.js'
    if library.resolve() != (root / 'three.min.js').resolve():
        shutil.copy2(root / 'three.min.js', library)
    return payload


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=pathlib.Path)
    parser.add_argument('--output', type=pathlib.Path, default=pathlib.Path(__file__).resolve().parent / 'Grapharium.html')
    args = parser.parse_args()
    data = build(args.source, args.output)
    print(f"Built {len(data['n']):,} symbols, {len(data['l']):,} relationships; {data['dropped_links']} unresolved links omitted")
    print(f'Offline viewer: {args.output}')


if __name__ == '__main__':
    main()
