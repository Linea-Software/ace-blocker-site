/** Small, finite, user-initiated walkthrough. No application state or persistence. */
export class DemoPlayback {
	step = $state(-1);
	playing = $state(false);
	private timer: ReturnType<typeof setTimeout> | undefined;

	constructor(
		readonly total: number,
		private readonly apply: (step: number) => void
	) {}

	private seek(step: number) {
		this.step = Math.max(-1, Math.min(this.total - 1, step));
		this.apply(this.step);
	}

	private queue() {
		if (!this.playing) return;
		if (this.step >= this.total - 1) {
			this.pause();
			return;
		}
		this.timer = setTimeout(() => {
			if (!this.playing) return;
			this.seek(this.step + 1);
			this.queue();
		}, 1450);
	}

	play() {
		if (this.playing) return;
		if (this.step >= this.total - 1) this.seek(-1);
		this.playing = true;
		this.queue();
	}

	pause() {
		this.playing = false;
		if (this.timer !== undefined) clearTimeout(this.timer);
		this.timer = undefined;
	}

	next() {
		this.pause();
		this.seek(this.step + 1);
	}

	previous() {
		this.pause();
		this.seek(this.step - 1);
	}

	replay() {
		this.pause();
		this.seek(-1);
		this.play();
	}

	/** A real visitor action always takes precedence over scripted playback. */
	manual() {
		this.pause();
	}

	dispose() {
		this.pause();
	}
}
