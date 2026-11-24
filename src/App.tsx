import { Loading } from 'solid-js';
import { Router } from './router';
import SiteHead from './SiteHead';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans-condensed/500.css';
import '@fontsource/ibm-plex-sans-condensed/600.css';
import '@fontsource/ibm-plex-sans-condensed/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './routes/layout.css';

export default function App() {
	return (
		<Router>
			{(props) => (
				<>
					<SiteHead />
					<Loading fallback={<div aria-live="polite" />}>{props.children}</Loading>
				</>
			)}
		</Router>
	);
}
