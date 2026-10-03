"""Revise A's badges and the contract emblem; preserve all other saved choices.

Native vector/font source editing only. No game assets are installed or overwritten.
"""
import argparse
import copy
import json
import os
import re
from pathlib import Path

from PIL import Image

from build import Art, ROOT, SCALE, font, tile, portal, make_art


class BadgeRevision(Art):
    def __init__(self, original, outlined):
        super().__init__(0)
        self.original = original
        self.outlined = outlined
        self.badge_box = None
        self.foreground = None

    def roundrect(self, box, radius, fill, outline=None, width=1):
        if len(self.labels) == 1 and box[2:] == (30, 30):
            self.badge_box = box
            return  # Repaint the badge above the main lettering.
        super().roundrect(box, radius, fill, outline, width)

    def text(self, text, center, size, color, **kwargs):
        if not self.labels:
            return super().text(text, center, size, color, **kwargs)
        old = self.original.labels[-1]
        assert old['text'] == text and self.badge_box
        old_box = font(old['size'], True).getbbox(text)
        new_size = old['size'] * 1.5
        new_box = font(new_size, True).getbbox(text)
        enlarge_max = text == 'LvMAX' and self.outlined
        vertical_scale = 1.25 if enlarge_max else 1
        if enlarge_max:
            # Use nearly the full tile width, leaving room for the outline.
            new_size *= 26 * SCALE / (new_box[2] - new_box[0])
            new_box = font(new_size, True).getbbox(text)
        # Preserve the actual glyph's lower-right corner, not its line box/baseline.
        anchor = [old['center'][0] + (old_box[2]-old_box[0])/(2*SCALE),
                  old['center'][1] + (old_box[3]-old_box[1])/(2*SCALE)]
        new_center = [anchor[0]-(new_box[2]-new_box[0])/(2*SCALE),
                      anchor[1]-(new_box[3]-new_box[1])/(2*SCALE)]
        foreground = Art()
        dark = '#642044' if text.startswith('Lv') else '#672f52'
        if not self.outlined:
            x, y, right, bottom = self.badge_box
            foreground.roundrect((right-(right-x)*1.5, bottom-(bottom-y)*1.5, right, bottom),
                                 2, dark, '#ed9cc1' if text.startswith('Lv') else '#ffcee2', .6)
        foreground.text(text, new_center, new_size, color, latin=True,
                        stroke=dark if self.outlined else old['stroke'],
                        stroke_width=1 if self.outlined else .375, max_width=100)
        if enlarge_max:
            foreground.text_layer = foreground.text_layer.transform(
                foreground.text_layer.size, Image.Transform.AFFINE,
                (1, 0, 0, 0, 1/vertical_scale, anchor[1]*SCALE*(1-1/vertical_scale)),
                resample=Image.Resampling.BICUBIC)
            foreground.labels[-1].update(verticalScale=vertical_scale, transformAnchor=anchor)
        self.foreground = foreground
        self.text_layer.alpha_composite(Image.alpha_composite(foreground.image, foreground.text_layer))
        self.labels.extend(foreground.labels)
        self.labels[-1].update(scaleFromA=new_size/old['size'], lowerRightAnchor=anchor,
                               treatment='outline' if self.outlined else 'rectangle',
                               layer='foreground-over-main-lettering')

    def save(self, directory, size):
        result = super().save(directory, size)
        self.foreground.save(directory/'badge-layer', size)
        return result


def badge_icon(id, outlined):
    art = BadgeRevision(make_art(id, 0), outlined)
    match = re.fullmatch(r'([ABCVM])SensitivityLv([1-5])', id)
    if match:
        part, level = match.groups()
        tile(art, part+'感', int(level), int(level)-1)
    elif id in ('Horny', 'InHeat', 'Frustrated', 'DesperateToCum'):
        i = ('Horny', 'InHeat', 'Frustrated', 'DesperateToCum').index(id)
        tile(art, '欲情', 'MAX' if i == 3 else i+1, i)
    else:
        portal(art, '侵' if id.startswith('Intruded') else '挿', id[-1])
    return art


def contract_emblem(bold=False):
    art = Art()
    pink = '#ef70ac'
    # Separate outward-facing bat wings, following the supplied silhouette.
    left = 'M 1 12.6 C 3.2 11.1 5.2 10.3 7.5 10.4 C 7 12.5 7.9 14.4 9.3 15.4 Q 7.9 15.3 6.8 16.2 Q 6.6 14.8 5 15.1 Q 6.5 12.2 1 12.6 Z'
    art.path(left, pink)
    # Mirror the sampled outline exactly for a balanced symbol.
    words = re.findall(r'[MLCQZ]|-?\d+(?:\.\d+)?', left)
    mirrored = []
    coordinate = 0
    for word in words:
        if word in 'MLCQZ':
            mirrored.append(word)
            coordinate = 0
        else:
            mirrored.append(str(32-float(word) if coordinate % 2 == 0 else float(word)))
            coordinate += 1
    art.path(' '.join(mirrored), pink)
    # Hollow heart: transparent fill, clean pink outline; solid small heart inside.
    art.path('M 16 12.8 C 12.9 8.8 10.1 11.2 10.3 14.3 C 10.6 17.3 14.7 18.5 16 21 C 17.3 18.5 21.4 17.3 21.7 14.3 C 21.9 11.2 19.1 8.8 16 12.8 Z',
             '#00000000', pink, 1.5 if bold else 1.05)
    art.path('M 16 15.2 C 14.3 13.3 13 15 14.5 16.6 L 16 18 L 17.5 16.6 C 19 15 17.7 13.3 16 15.2 Z', pink)
    return art


def revise(previous, selection, output):
    manifest = json.loads((previous/'manifest.json').read_text(encoding='utf-8'))
    saved = json.loads(selection.read_text(encoding='utf-8-sig'))
    targets = {r['id'] for r in manifest['icons'] if 'SensitivityLv' in r['id']}
    targets.update(['Horny', 'InHeat', 'Frustrated', 'DesperateToCum',
                    'IntrudedA', 'IntrudedV', 'IntrudedM', 'InsertA', 'InsertV', 'InsertM', 'contractSigil'])
    rows = [copy.deepcopy(r) for r in manifest['icons'] if r['id'] in targets]
    assert len(rows) == 36
    known = {(r['kind'], r['id']): r for r in manifest['icons']}
    base = []
    for choice in saved['choices']:
        source = previous/choice['file']
        row = known[(choice['kind'], choice['id'])]
        assert any(v['variant'] == choice['variant'] and v['file'] == choice['file'] for v in row['variants'])
        assert source.is_file()
        if choice['id'] not in targets:
            item = dict(choice)
            item['file'] = Path(os.path.relpath(source, output)).as_posix()
            base.append(item)
    selected_ids = {(c['kind'], c['id']) for c in saved['choices']}
    pending = [copy.deepcopy(r) for r in manifest['icons']
               if r['id'] not in targets and (r['kind'], r['id']) not in selected_ids]
    output.mkdir(parents=True, exist_ok=False)
    (output/'previous-selections.json').write_text(json.dumps(saved, ensure_ascii=False, indent=2), encoding='utf-8')
    for row in rows:
        row['variants'] = []
        if row['id'] == 'InsertM':
            row['selectionVersion'] = 'enlarged-badge-v1'
        row['previousFile'] = Path(os.path.relpath(previous/row['kind']/row['id']/'A/icon.png', output)).as_posix()
        if row['id'] == 'contractSigil':
            row['instruction'] = '参考の形状：中空のハート＋中央の小ハート＋左右に離れたコウモリの翼。'
        else:
            row['instruction'] = 'A案を基に、右下表記を1.5倍。文字の右下位置を維持し、背景・縁取りは大文字より前面に重ねています。'
        for index, name in enumerate('AB'):
            emblem = row['id'] == 'contractSigil'
            art = contract_emblem(index == 1) if emblem else badge_icon(row['id'], index == 1)
            folder = output/row['kind']/row['id']/name
            image = art.save(folder, row['size'])
            assert image.mode == 'RGBA' and image.size == (row['size'], row['size'])
            assert image.getchannel('A').getextrema() == (0, 255)
            if not emblem:
                original = json.loads((previous/row['kind']/row['id']/'A/lettering.json').read_text(encoding='utf-8'))
                assert json.loads(json.dumps(art.labels[0])) == original[0]
                if row['id'] == 'DesperateToCum' and index == 1:
                    assert art.labels[-1]['size'] / original[-1]['size'] > 1.5
                    assert art.labels[-1]['verticalScale'] == 1.25
                else:
                    assert abs(art.labels[-1]['size'] / original[-1]['size'] - 1.5) < 1e-9
            row['variants'].append(dict(variant=name,
                label=('参考形状 / 細め' if index == 0 else '参考形状 / 太め') if emblem else ('四角背景' if index == 0 else '文字の縁取り'),
                file=(folder/'icon.png').relative_to(output).as_posix(), textLayers=art.labels))
    for row in pending:
        row['instruction'] = '保存JSONでは未選択でした。以前の候補をそのまま掲載しています。今回の変更対象ではありません。'
        for variant in row['variants']:
            variant['file'] = Path(os.path.relpath(previous/variant['file'], output)).as_posix()
            variant['label'] = '以前の候補（未変更）'
    result = dict(method=manifest['method'], fonts=manifest['fonts'], icons=rows+pending,
                  count=len(rows)*2+sum(len(r['variants']) for r in pending), revisedIcons=len(rows),
                  baseChoices=base, previousSelectionFile='previous-selections.json',
                  revision=True, totalIcons=64)
    (output/'manifest.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    template=Path(__file__).with_name('review.html').read_text(encoding='utf-8')
    (output/'index.html').write_text(template.replace('__MANIFEST__', json.dumps(result, ensure_ascii=False).replace('</','<\\/')), encoding='utf-8')
    (output/'README.txt').write_text(
        f'{len(rows)} revised icons / {len(rows)*2} new candidates. Other {len(base)} saved choices are preserved in manifest.baseChoices.\n'
        'A: 1.5x rectangular badge; B: 1.5x outlined text. contractSigil: thin / bold heart outline.\n'
        'InsertA, InsertV and InsertM revised. No game icons installed.\n'
        'previous-selections.json is an exact semantic copy of the supplied saved choices.\n'
        'lettering.png includes the foreground badge above the main lettering. badge-layer/ stores it separately.\n'
        'All candidate paths in exported selections resolve relative to this gallery directory.\n', encoding='utf-8')
    print(json.dumps(dict(output=str(output), icons=len(rows), candidates=len(rows)*2, preservedChoices=len(base),
                         validation='RGBA, dimensions, actual 1.5x font size, unchanged main lettering verified'), ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--previous', default='image/icon/candidates/2026-10-02-final')
    parser.add_argument('--selections', required=True, type=Path)
    parser.add_argument('--output', default='image/icon/candidates/2026-10-02-revision1')
    args = parser.parse_args()
    output = (ROOT/args.output).resolve()
    if not output.is_relative_to(ROOT):
        raise ValueError('Output must stay inside the project')
    revise((ROOT/args.previous).resolve(), args.selections, output)
