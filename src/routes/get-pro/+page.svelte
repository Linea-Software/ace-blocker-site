<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Check, Shield, Zap, LayoutGrid, Smartphone, Lock, Infinity, ShieldAlert, Globe, ArrowRight } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';
</script>

<Navbar />

<main class="min-h-[calc(100vh-4rem)] bg-muted/30 py-16 md:py-24">
	<div class="container mx-auto px-4">
		<!-- Header -->
		<div class="max-w-2xl mx-auto text-center mb-16 space-y-4">
			<Badge variant="outline" class="px-3 py-1 text-sm font-medium border-primary/20 text-primary">
				Pricing Plans
			</Badge>
			<h1 class="text-4xl md:text-5xl font-extrabold tracking-tight">
				{m.pro_title()}
			</h1>
			<p class="text-xl text-muted-foreground">
				{m.pro_subtitle()}
			</p>
		</div>

		<!-- Pricing Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
			<!-- Free Plan -->
			<Card.Root class="relative overflow-hidden flex flex-col border-2 border-transparent bg-background shadow-sm">
				<Card.Header class="pb-8">
					<div class="flex justify-between items-start mb-4">
						<Card.Title class="text-2xl font-bold">{m.plan_free_name()}</Card.Title>
					</div>
					<div class="flex items-baseline gap-1 mb-2">
						<span class="text-4xl font-extrabold">{m.plan_free_price()}</span>
					</div>
					<Card.Description>{m.plan_free_description()}</Card.Description>
				</Card.Header>
				<Card.Content class="flex-1 space-y-4">
					<div class="flex items-center gap-3">
						<div class="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center">
							<Check class="h-3 w-3 text-muted-foreground" />
						</div>
						<span class="text-sm font-medium text-muted-foreground">{m.feature_basic_blocking()}</span>
					</div>
					<div class="flex items-center gap-3">
						<div class="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center">
							<Check class="h-3 w-3 text-muted-foreground" />
						</div>
						<span class="text-sm font-medium text-muted-foreground">{m.feature_devices_free()}</span>
					</div>
				</Card.Content>
				<Card.Footer class="pt-8">
					<Button variant="outline" class="w-full h-11" href="/signup">
						{m.cta_get_started()}
					</Button>
				</Card.Footer>
			</Card.Root>

			<!-- Pro Plan -->
			<Card.Root class="relative overflow-hidden flex flex-col border-2 border-primary bg-background shadow-2xl md:-mt-4 md:-mb-4">
				<div class="absolute top-0 right-0 p-0 m-0 overflow-hidden w-32 h-32 pointer-events-none">
					<div class="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest text-center py-1 absolute top-6 -right-8 w-32 rotate-45 shadow-sm">
						Popular
					</div>
				</div>
				<Card.Header class="pb-8">
					<div class="flex justify-between items-start mb-4">
						<Card.Title class="text-2xl font-bold text-primary">{m.plan_pro_name()}</Card.Title>
						<Badge class="bg-primary/20 text-primary border-transparent">BEST VALUE</Badge>
					</div>
					<div class="flex flex-col mb-2">
						<div class="flex items-baseline gap-1">
							<span class="text-5xl font-extrabold tracking-tight">{m.plan_pro_price()}</span>
							<span class="text-muted-foreground font-medium">{m.plan_pro_duration()}</span>
						</div>
						<span class="text-[10px] text-muted-foreground mt-1">*Excl. taxes</span>
					</div>
					<Card.Description>{m.plan_pro_description()}</Card.Description>
				</Card.Header>
				<Card.Content class="flex-1 space-y-4">
					<div class="flex items-center gap-3">
						<div class="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
							<Check class="h-3 w-3 text-primary-foreground" />
						</div>
						<span class="text-sm font-bold">{m.feature_devices_pro()}</span>
					</div>
					<div class="flex items-center gap-3">
						<div class="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
							<Check class="h-3 w-3 text-primary-foreground" />
						</div>
						<span class="text-sm font-bold">{m.feature_scripts_pro()}</span>
					</div>
					<div class="flex items-center gap-3">
						<div class="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
							<Check class="h-3 w-3 text-primary-foreground" />
						</div>
						<span class="text-sm font-bold">{m.feature_lists_pro()}</span>
					</div>
					<div class="flex items-center gap-3">
						<div class="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
							<Check class="h-3 w-3 text-primary-foreground" />
						</div>
						<span class="text-sm font-bold">{m.feature_prevention_pro()}</span>
					</div>
				</Card.Content>
				<Card.Footer class="pt-8">
					<Button class="w-full h-12 text-lg font-bold shadow-lg shadow-primary/25" href="/signup">
						{m.cta_upgrade_now()}
					</Button>
				</Card.Footer>
			</Card.Root>
		</div>

		<!-- Refined Features Section -->
		<div class="mt-32 max-w-6xl mx-auto">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
				<div class="space-y-8">
					<div class="space-y-4">
						<h2 class="text-3xl font-bold tracking-tight">The ultimate focus toolbox.</h2>
						<p class="text-lg text-muted-foreground">
							Don't just block sites. Change your relationship with the internet using our advanced features designed for deep work.
						</p>
					</div>
					
					<div class="grid grid-cols-1 gap-6">
						<div class="flex gap-4 p-4 rounded-xl border bg-background/50 hover:bg-background transition-colors">
							<div class="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
								<Infinity class="h-6 w-6 text-primary" />
							</div>
							<div>
								<h3 class="font-bold">{m.feature_devices_pro()}</h3>
								<p class="text-sm text-muted-foreground">Protect your entire digital ecosystem—laptop, desktop, and mobile.</p>
							</div>
						</div>

						<div class="flex gap-4 p-4 rounded-xl border bg-background/50 hover:bg-background transition-colors">
							<div class="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
								<Zap class="h-6 w-6 text-blue-500" />
							</div>
							<div>
								<h3 class="font-bold">{m.feature_scripts_pro()}</h3>
								<p class="text-sm text-muted-foreground">Make addictive sites boring by stripping away reels, infinite scrolls, and notifications.</p>
							</div>
						</div>

						<div class="flex gap-4 p-4 rounded-xl border bg-background/50 hover:bg-background transition-colors">
							<div class="flex-shrink-0 w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
								<LayoutGrid class="h-6 w-6 text-green-500" />
							</div>
							<div>
								<h3 class="font-bold">{m.feature_lists_pro()}</h3>
								<p class="text-sm text-muted-foreground">Stop hunting for blocklists. We provide expertly curated lists for all major distractions.</p>
							</div>
						</div>

						<div class="flex gap-4 p-4 rounded-xl border bg-background/50 hover:bg-background transition-colors">
							<div class="flex-shrink-0 w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
								<ShieldAlert class="h-6 w-6 text-purple-500" />
							</div>
							<div>
								<h3 class="font-bold">{m.feature_prevention_pro()}</h3>
								<p class="text-sm text-muted-foreground">Add layers of friction that make it impossible to give in when willpower is low.</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Visual Representation Section -->
				<div class="relative bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl p-8 aspect-square flex items-center justify-center border-2 border-primary/5">
					<div class="space-y-6 w-full max-w-xs">
						<div class="bg-background rounded-2xl p-4 shadow-xl border-2 border-primary transform -rotate-3 hover:rotate-0 transition-transform">
							<div class="flex items-center gap-3 mb-4">
								<div class="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
									<Globe class="h-4 w-4" />
								</div>
								<div class="h-2 w-24 bg-muted rounded"></div>
							</div>
							<div class="space-y-2">
								<div class="h-8 w-full bg-primary/10 rounded-md flex items-center px-3 justify-between">
									<div class="h-2 w-20 bg-primary/30 rounded"></div>
									<div class="h-4 w-4 bg-primary rounded-full"></div>
								</div>
							</div>
						</div>
						
						<div class="bg-background rounded-2xl p-4 shadow-xl border border-border translate-x-12 transform rotate-6 hover:rotate-0 transition-transform">
							<div class="flex items-center gap-2 mb-4">
								<Shield class="h-4 w-4 text-primary" />
								<div class="h-2 w-32 bg-muted rounded"></div>
							</div>
							<div class="h-2 w-full bg-muted rounded mb-2"></div>
							<div class="h-2 w-2/3 bg-muted rounded"></div>
						</div>
						
						<div class="pt-8 flex justify-center">
							<div class="p-3 rounded-full bg-primary text-primary-foreground shadow-2xl">
								<ArrowRight class="h-6 w-6" />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</main>

<footer class="border-t py-12 bg-background">
	<div class="container mx-auto px-4">
		<div class="flex flex-col md:flex-row justify-between items-center gap-8">
			<div class="flex items-center gap-2">
				<Shield class="h-5 w-5 text-primary" />
				<span class="font-bold tracking-tight">{m.hero_title_app()}</span>
			</div>
			<p class="text-sm text-muted-foreground">
				&copy; {new Date().getFullYear()} {m.footer_rights_suffix()}
			</p>
			<div class="flex items-center gap-6">
				<a href="/terms" class="text-sm text-muted-foreground hover:text-foreground">{m.footer_terms()}</a>
				<a href="/privacy" class="text-sm text-muted-foreground hover:text-foreground">{m.footer_privacy()}</a>
			</div>
		</div>
	</div>
</footer>
