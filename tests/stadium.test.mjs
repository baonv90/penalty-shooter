import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import * as THREE from 'three';

const bundle = await build({
  entryPoints: [new URL('../src/utils/models.ts', import.meta.url).pathname],
  bundle: true, write: false, format: 'esm', platform: 'node', external: ['three'],
});
const source = bundle.outputFiles[0].text.replaceAll('"three"', JSON.stringify(import.meta.resolve('three')));
const { createOptimizedStadium } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('supporter shirts and flags use the corresponding team jersey color', () => {
  const home = 0xdc2626;
  const away = 0x2563eb;
  const stadium = createOptimizedStadium(home, away);
  const color = new THREE.Color();
  let flag = 0;
  stadium.fanPositions.forEach((fan, index) => {
    const expected = fan.isHome ? home : away;
    stadium.bodiesInstanced.getColorAt(index, color);
    assert.equal(color.getHex(), expected);
    if (index % 10 === 0 && flag < stadium.flagCount) {
      stadium.flagsInstanced.getColorAt(flag++, color);
      assert.equal(color.getHex(), expected);
    }
  });
  assert.equal(stadium.flagsInstanced.material.color.getHex(), 0xffffff);
});
