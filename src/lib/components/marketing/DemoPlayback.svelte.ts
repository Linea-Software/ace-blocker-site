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
	step = $state(-1);
	playing = $state(false);
	phase = $state<DemoPhase>('idle');
	pointerTarget = $state('');
	pointerVisible = $state(false);
	pointerTravelMs = $state<number>(DEFAULT_TIMING.travelMs);

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
		this.step = Math.max(-1, Math.min(this.total - 1, step));
		this.apply(this.step);
	}

	private after(duration: number, callback: () => void) {
		this.timer = setTimeout(() => {
			this.timer = undefined;
			if (this.playing) callback();
		}, duration);
	}

	private advance() {
		if (!this.playing) return;
		if (this.step >= this.total - 1) {
			this.pause();
			return;
		}
		const index = this.step + 1;
		const cue = this.cues[index];
		if (cue.passive) {
			this.pointerVisible = false;
			this.pointerTarget = '';
			this.phase = 'settle';
			this.after(cue.settleMs ?? DEFAULT_TIMING.settleMs, () => {
				this.seek(index);
				this.advance();
			});
			return;
		}
		this.pointerVisible = true;
		const travel = cue.travelMs ?? DEFAULT_TIMING.travelMs;
		const hover = cue.hoverMs ?? DEFAULT_TIMING.hoverMs;
		const press = cue.pressMs ?? DEFAULT_TIMING.pressMs;
		const settle = cue.settleMs ?? DEFAULT_TIMING.settleMs;

		this.pointerTravelMs = travel;
		this.pointerTarget = cue.target;
		this.phase = 'travel';
		this.after(travel, () => {
			this.phase = 'hover';
			this.after(hover, () => {
				this.phase = 'press';
				this.after(press, () => {
					this.seek(index);
					this.phase = 'settle';
					this.after(settle, () => this.advance());
				});
			});
		});
	}

	play() {
		if (this.playing || this.total === 0) return;
		// Manual edits may leave the visible wizard on a different stage.
		// Restart at a known scene so the next pointer target actually exists.
		if (this.manualOverride || this.step >= this.total - 1) this.seek(-1);
		this.manualOverride = false;
		if (this.step === -1) this.prepare?.();
		this.playing = true;
		this.pointerVisible = true;
		this.advance();
	}

	pause() {
		this.playing = false;
		this.phase = 'idle';
		if (this.timer !== undefined) clearTimeout(this.timer);
		this.timer = undefined;
	}

	next() {
		this.pause();
		this.pointerVisible = false;
		this.seek(this.step + 1);
	}

	previous() {
		this.pause();
		this.pointerVisible = false;
		this.seek(this.step - 1);
	}

	replay() {
		this.pause();
		this.manualOverride = false;
		this.pointerVisible = false;
		this.seek(-1);
		this.play();
	}

	manual() {
		this.pause();
		this.manualOverride = true;
		this.pointerVisible = false;
	}

	dispose() {
		this.manual();
	}
}
