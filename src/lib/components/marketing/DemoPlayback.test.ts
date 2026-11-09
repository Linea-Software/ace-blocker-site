import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DemoPlayback } from './DemoPlayback.svelte';

describe('guided marketing demo playback', () => {
	let applied: number[];
	let playback: DemoPlayback;

	beforeEach(() => {
		vi.useFakeTimers();
		applied = [];
		playback = new DemoPlayback(3, (step) => applied.push(step));
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

	it('plays finite steps and stops without looping', () => {
		playback.play();
		vi.advanceTimersByTime(1450 * 3);
		expect(applied).toEqual([0, 1, 2]);
		expect(playback.step).toBe(2);
		expect(playback.playing).toBe(false);
		vi.advanceTimersByTime(30_000);
		expect(applied).toEqual([0, 1, 2]);
	});

	it('pause retains the current step', () => {
		playback.play();
		vi.advanceTimersByTime(1450);
		playback.pause();
		vi.advanceTimersByTime(30_000);
		expect(playback.step).toBe(0);
		expect(applied).toEqual([0]);
	});

	it('manual interaction interrupts playback', () => {
		playback.play();
		vi.advanceTimersByTime(1450);
		playback.manual();
		vi.advanceTimersByTime(20_000);
		expect(playback.playing).toBe(false);
		expect(applied).toEqual([0]);
	});

	it('previous and next allow controlled navigation without autoplay', () => {
		playback.next();
		playback.next();
		playback.previous();
		expect(playback.step).toBe(0);
		expect(applied).toEqual([0, 1, 0]);
		expect(playback.playing).toBe(false);
	});

	it('replay resets state, then starts once', () => {
		playback.next();
		playback.next();
		playback.replay();
		expect(applied).toEqual([0, 1, -1]);
		expect(playback.playing).toBe(true);
		vi.advanceTimersByTime(1450);
		expect(playback.step).toBe(0);
	});

	it('dispose cancels pending playback', () => {
		playback.play();
		playback.dispose();
		vi.advanceTimersByTime(10_000);
		expect(applied).toEqual([]);
	});
});
