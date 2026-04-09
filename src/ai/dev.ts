import { config } from 'dotenv';
config();

import '@/ai/flows/generate-analytical-briefing-sections.ts';
import '@/ai/flows/group-articles-into-event-clusters-flow.ts';
import '@/ai/flows/generate-curated-briefing.ts';