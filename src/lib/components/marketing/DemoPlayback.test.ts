import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DemoPlayback } from './DemoPlayback.svelte';

const CYCLE = 660 + 210 + 160 + 590;

describe('guided marketing demo playback', () => {
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

	it('does not begin automatically', () => {
		vi.advanceTimersByTime(10_000);
		expect(playback.step).toBe(-1);
		expect(playback.playing).toBe(false);
		expect(applied).toEqual([]);
	});

	it('moves, hovers and presses before applying an action', () => {
		playback.play();
		expect(playback.pointerVisible).toBe(true);
		expect(playback.pointerTarget).toBe('category');
		expect(playback.phase).toBe('travel');
		expect(applied).toEqual([]);

		vi.advanceTimersByTime(660);
		expect(playback.phase).toBe('hover');
		expect(playback.step).toBe(-1);

		vi.advanceTimersByTime(210);
		expect(playback.phase).toBe('press');
		expect(applied).toEqual([]);

		vi.advanceTimersByTime(159);
		expect(playback.step).toBe(-1);
		vi.advanceTimersByTime(1);
		expect(playback.step).toBe(0);
		expect(playback.phase).toBe('settle');
		expect(applied).toEqual([0]);
	});

	it('plays finite steps in order and stops without looping', () => {
		playback.play();
		vi.advanceTimersByTime(CYCLE * 3);
		expect(applied).toEqual([0, 1, 2]);
		expect(playback.step).toBe(2);
		expect(playback.playing).toBe(false);
		vi.advanceTimersByTime(30_000);
		expect(applied).toEqual([0, 1, 2]);
	});

	it('pause cancels pending press and leaves completed steps intact', () => {
		playback.play();
		vi.advanceTimersByTime(CYCLE);
		playback.pause();
		vi.advanceTimersByTime(30_000);
		expect(playback.step).toBe(0);
		expect(applied).toEqual([0]);
		expect(playback.playing).toBe(false);
	});

	it('manual interaction hides the scripted pointer', () => {
		playback.play();
		vi.advanceTimersByTime(600);
		playback.manual();
		expect(playback.pointerVisible).toBe(false);
		expect(playback.phase).toBe('idle');
		vi.advanceTimersByTime(20_000);
		expect(applied).toEqual([]);
	});

	it('previous and next allow controlled navigation without autoplay', () => {
		playback.next();
		playback.next();
		playback.previous();
		expect(playback.step).toBe(0);
		expect(applied).toEqual([0, 1, 0]);
		expect(playback.playing).toBe(false);
		expect(playback.pointerVisible).toBe(false);
	});

	it('replay resets state and starts with cursor movement', () => {
		playback.next();
		playback.next();
		playback.replay();
		expect(applied).toEqual([0, 1, -1]);
		expect(playback.playing).toBe(true);
		expect(playback.phase).toBe('travel');
		vi.advanceTimersByTime(1030);
		expect(playback.step).toBe(0);
	});

	it('custom motion and settle intervals are respected', () => {
		const custom: number[] = [];
		const sequence = new DemoPlayback(
			[{ target: 'custom', travelMs: 900, hoverMs: 300, pressMs: 150, settleMs: 450 }],
			(step) => custom.push(step)
		);
		sequence.play();
		vi.advanceTimersByTime(1349);
		expect(custom).toEqual([]);
		vi.advanceTimersByTime(1);
		expect(custom).toEqual([0]);
		vi.advanceTimersByTime(450);
		expect(sequence.playing).toBe(false);
		sequence.dispose();
	});

	it('restarting after a manual edit restores a known scene before cursor travel', () => {
		playback.next();
		playback.manual();
		playback.play();
		expect(applied).toEqual([0, -1]);
		expect(playback.step).toBe(-1);
		expect(playback.phase).toBe('travel');
		expect(playback.pointerTarget).toBe('category');
	});

	it('runs the preparation hook before the first cue and when restarting after manual changes', () => {
		const prepare = vi.fn();
		const guided = new DemoPlayback([{ target: 'one' }, { target: 'two' }], () => {}, prepare);
		guided.play();
		expect(prepare).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(CYCLE);
		guided.pause();
		guided.play();
		expect(prepare).toHaveBeenCalledTimes(1);
		guided.manual();
		guided.play();
		expect(prepare).toHaveBeenCalledTimes(2);
		guided.dispose();
	});

	it('dispose cancels all pending playback timers', () => {
		playback.play();
		playback.dispose();
		vi.advanceTimersByTime(20_000);
		expect(applied).toEqual([]);
	});
});
