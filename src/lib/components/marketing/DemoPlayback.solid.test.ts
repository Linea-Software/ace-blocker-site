import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flush } from 'solid-js';
import { DemoPlayback } from './DemoPlayback';

const CYCLE = 660 + 210 + 160 + 590;

describe('Solid marketing guided playback parity', () => {
	let applied: number[];
	let playback: DemoPlayback;

	beforeEach(() => {
		vi.useFakeTimers();
		applied = [];
		playback = new DemoPlayback(
			[{ target: 'category' }, { target: 'save' }, { target: 'lock' }],
			(step) => applied.push(step)
		);
	});

	afterEach(() => {
		playback.dispose();
		vi.useRealTimers();
	});

	it('does not autoplay', () => {
		vi.advanceTimersByTime(10000);
		flush();
		expect(playback.playing).toBe(false);
		flush();
		expect(playback.step).toBe(-1);
		expect(applied).toEqual([]);
	});

	it('moves, hovers and presses before changing state', () => {
		playback.play();
		flush();
		expect(playback.pointerTarget).toBe('category');
		flush();
		expect(playback.phase).toBe('travel');
		vi.advanceTimersByTime(660);
		flush();
		expect(playback.phase).toBe('hover');
		vi.advanceTimersByTime(210);
		flush();
		expect(playback.phase).toBe('press');
		expect(applied).toEqual([]);
		vi.advanceTimersByTime(160);
		flush();
		expect(playback.step).toBe(0);
		flush();
		expect(playback.phase).toBe('settle');
		expect(applied).toEqual([0]);
	});

	it('stops after finite cues', () => {
		playback.play();
		vi.advanceTimersByTime(CYCLE * 3);
		expect(applied).toEqual([0, 1, 2]);
		flush();
		expect(playback.playing).toBe(false);
	});

	it('manual action prevents any pending scripted click', () => {
		playback.play();
		vi.advanceTimersByTime(600);
		playback.manual();
		flush();
		expect(playback.pointerVisible).toBe(false);
		vi.advanceTimersByTime(CYCLE * 3);
		expect(applied).toEqual([]);
	});

	it('replay starts from a known scene and dispose cancels timers', () => {
		playback.next();
		playback.manual();
		playback.play();
		expect(applied).toEqual([0, -1]);
		flush();
		expect(playback.phase).toBe('travel');
		playback.dispose();
		vi.advanceTimersByTime(CYCLE);
		expect(applied).toEqual([0, -1]);
	});
});
