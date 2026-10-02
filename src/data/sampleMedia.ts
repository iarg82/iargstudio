import { VideoClip } from '../types';

export interface SampleImage {
  id: string;
  title: string;
  category: string;
  url: string;
  suggestedPrompt: string;
  suggestedMotion: 'dolly-in' | 'orbit-pan' | 'ken-burns' | 'crane-tilt' | 'vortex-zoom';
}

export const SAMPLE_IMAGES: SampleImage[] = [
  {
    id: 'cyberpunk-city',
    title: 'Neon Cyberpunk Street',
    category: 'Sci-Fi',
    url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    suggestedPrompt: 'Slow cinematic tracking shot down a neon-drenched Tokyo cyberpunk alleyway, puddles reflecting magenta and cyan neon signs, light atmospheric mist.',
    suggestedMotion: 'dolly-in',
  },
  {
    id: 'alpine-mountain',
    title: 'Majestic Alpine Ridge',
    category: 'Nature',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    suggestedPrompt: 'Aerial sweeping cinematic drone shot over snowcapped jagged peaks at sunrise, golden sunlight illuminating drifting cloud inversions.',
    suggestedMotion: 'orbit-pan',
  },
  {
    id: 'cinematic-portrait',
    title: 'Neon Cybernetic Portrait',
    category: 'Portrait',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
    suggestedPrompt: 'Cinematic shallow depth-of-field portrait, subtle hair movement in gentle breeze, warm anamorphic rim light reflecting in eyes.',
    suggestedMotion: 'ken-burns',
  },
  {
    id: 'cosmic-nebula',
    title: 'Interstellar Nebula',
    category: 'Space',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    suggestedPrompt: 'Slow cosmic vortex push through glowing stellar dust clouds, luminous star clusters drifting with ethereal gravity waves.',
    suggestedMotion: 'vortex-zoom',
  },
  {
    id: 'sunset-ocean',
    title: 'Sunset Coastal Surf',
    category: 'Ocean',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    suggestedPrompt: 'Low-angle golden hour glide over glistening ocean shorebreak, gentle sea spray catching the setting sun.',
    suggestedMotion: 'crane-tilt',
  },
];

export const SAMPLE_PROMPTS = [
  {
    title: 'Cyberpunk Metropolis',
    prompt: 'Cinematic drone fly-through down futuristic skyscraper canyons in Neo-Tokyo, flying vehicles with glowing light trails, holographic neon advertisements shimmering in dense evening rain, 35mm lens, 60fps.',
    motion: 'dolly-in',
    aspectRatio: '16:9',
  },
  {
    title: 'Golden Hour Serengeti',
    prompt: 'Slow-motion 120fps tracking shot of a majestic lioness walking across sun-drenched savannah grass, golden backlight catching floating dust motes, telephoto lens with creamy bokeh.',
    motion: 'orbit-pan',
    aspectRatio: '16:9',
  },
  {
    title: 'Liquid Mercury Sphere',
    prompt: 'Hypnotic macro video of an iridescent liquid chrome sphere floating in zero gravity, reflecting neon geometric lasers, rippling surface tension, 4k ultra-detailed.',
    motion: 'vortex-zoom',
    aspectRatio: '1:1',
  },
  {
    title: 'Vertical Fashion Run',
    prompt: 'Vertical 9:16 high-fashion street model walking briskly through Paris at dusk, trench coat fluttering, anamorphic lens flares, vibrant streetlights.',
    motion: 'crane-tilt',
    aspectRatio: '9:16',
  },
];

// Royalty-free open sample video clips
export const INITIAL_SAMPLE_CLIPS: VideoClip[] = [
  {
    id: 'sample-clip-1',
    title: 'Ocean Waves Sunset',
    sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
    duration: 15,
    trimStart: 0,
    trimEnd: 6,
    volume: 1,
    transition: 'none',
    transitionDuration: 0.8,
    generatedBy: 'sample',
  },
  {
    id: 'sample-clip-2',
    title: 'Urban Cyber Lights',
    sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80',
    duration: 15,
    trimStart: 0,
    trimEnd: 5,
    volume: 0.9,
    transition: 'crossfade',
    transitionDuration: 0.8,
    generatedBy: 'sample',
  },
  {
    id: 'sample-clip-3',
    title: 'High-Speed Aerial',
    sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80',
    duration: 15,
    trimStart: 1,
    trimEnd: 7,
    volume: 0.8,
    transition: 'wipe-right',
    transitionDuration: 0.8,
    generatedBy: 'sample',
  },
];
