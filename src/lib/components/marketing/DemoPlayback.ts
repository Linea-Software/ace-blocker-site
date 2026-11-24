import { createSignal } from 'solid-js';
/** A finite walkthrough: cursor travels to a control before its effect occurs. */
export type DemoPhase = 'idle' | 'travel' | 'hover' | 'press' | 'settle';

export type DemoCue = {
	target: string;
	/** A timed visual response with no pointer click (e.g. a network reply). */
	passive?: boolean;
	travelMs?: number;
	hoverMs?: number;
	pressMs?: number;
	settleMs?: number;
};

const DEFAULT_TIMING = {
	travelMs: 660,
	hoverMs: 210,
	pressMs: 160,
	settleMs: 590
} as const;

export class DemoPlayback {
	// Timers and user actions operate on a synchronous state machine. Solid 2
	// commits signal writes asynchronously; never read a pending write to decide
	// the next timer or step. Publish immutable snapshots for the rendered UI.
	private current = {
		step: -1,
		playing: false,
		phase: 'idle' as DemoPhase,
		pointerTarget: '',
		pointerVisible: false,
		pointerTravelMs: DEFAULT_TIMING.travelMs as number
	};
	private readonly reactive = createSignal(this.current);

	private update(patch: Partial<DemoPlayback['current']>) {
		this.current = { ...this.current, ...patch };
		this.reactive[1](this.current);
	}

	get step() {
		return this.reactive[0]().step;
	}
	get playing() {
		return this.reactive[0]().playing;
	}
	get phase() {
		return this.reactive[0]().phase;
	}
	get pointerTarget() {
		return this.reactive[0]().pointerTarget;
	}
	get pointerVisible() {
		return this.reactive[0]().pointerVisible;
	}
	get pointerTravelMs() {
		return this.reactive[0]().pointerTravelMs;
	}

	private timer: ReturnType<typeof setTimeout> | undefined;
	private manualOverride = false;
	private readonly cues: DemoCue[];
	readonly total: number;

	constructor(
		cues: DemoCue[] | number,
		private readonly apply: (step: number) => void,
		private readonly prepare?: () => void
	) {
		this.cues =
			typeof cues === 'number' ? Array.from({ length: cues }, () => ({ target: '' })) : cues;
		this.total = this.cues.length;
	}

	private seek(step: number) {
		this.update({ step: Math.max(-1, Math.min(this.total - 1, step)) });
		this.apply(this.current.step);
	}

	private after(duration: number, callback: () => void) {
		this.timer = setTimeout(() => {
			this.timer = undefined;
			if (this.current.playing) callback();
		}, duration);
	}

	private advance() {
		if (!this.current.playing) return;
		if (this.current.step >= this.total - 1) {
			this.pause();
			return;
		}
		const index = this.current.step + 1;
		const cue = this.cues[index];
		if (cue.passive) {
			this.update({ pointerVisible: false });
			this.update({ pointerTarget: '' });
			this.update({ phase: 'settle' });
			this.after(cue.settleMs ?? DEFAULT_TIMING.settleMs, () => {
				this.seek(index);
				this.advance();
			});
			return;
		}
		this.update({ pointerVisible: true });
		const travel = cue.travelMs ?? DEFAULT_TIMING.travelMs;
		const hover = cue.hoverMs ?? DEFAULT_TIMING.hoverMs;
		const press = cue.pressMs ?? DEFAULT_TIMING.pressMs;
		const settle = cue.settleMs ?? DEFAULT_TIMING.settleMs;

		this.update({ pointerTravelMs: travel });
		this.update({ pointerTarget: cue.target });
		this.update({ phase: 'travel' });
		this.after(travel, () => {
			this.update({ phase: 'hover' });
			this.after(hover, () => {
				this.update({ phase: 'press' });
				this.after(press, () => {
					this.seek(index);
					this.update({ phase: 'settle' });
					this.after(settle, () => this.advance());
				});
			});
		});
	}

	play() {
		if (this.current.playing || this.total === 0) return;
		// Manual edits may leave the visible wizard on a different stage.
		// Restart at a known scene so the next pointer target actually exists.
		if (this.manualOverride || this.current.step >= this.total - 1) this.seek(-1);
		this.manualOverride = false;
		if (this.current.step === -1) this.prepare?.();
		this.update({ playing: true });
		this.update({ pointerVisible: true });
		this.advance();
	}

	pause() {
		this.update({ playing: false });
		this.update({ phase: 'idle' });
		if (this.timer !== undefined) clearTimeout(this.timer);
		this.timer = undefined;
	}

	next() {
		this.pause();
		this.update({ pointerVisible: false });
		this.seek(this.current.step + 1);
	}

	previous() {
		this.pause();
		this.update({ pointerVisible: false });
		this.seek(this.current.step - 1);
	}

	replay() {
		this.pause();
		this.manualOverride = false;
		this.update({ pointerVisible: false });
		this.seek(-1);
		this.play();
	}

	manual() {
		this.pause();
		this.manualOverride = true;
		this.update({ pointerVisible: false });
	}

	dispose() {
		this.manual();
	}
}
