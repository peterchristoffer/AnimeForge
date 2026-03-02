export type AnimeStyle = 'Shonen' | 'Shojo' | 'Seinen' | 'Cyberpunk' | 'Fantasy' | 'Ghibli-esque' | 'Mecha' | 'Horror' | 'Slice of Life' | 'Isekai' | 'Retro 90s' | 'Ukiyo-e';

export interface CharacterFeatures {
  hairColor: string;
  eyeColor: string;
  outfit: string;
  accessory: string;
}

export interface CharacterData {
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  style: AnimeStyle;
  customStyle?: string;
  clothingStyle?: string;
  features: CharacterFeatures;
  personality: string;
  photoBase64?: string;
  imageSize: '1K' | '2K' | '4K';
}

export interface GeneratedCharacter {
  imageUrl: string;
  story: string;
  japaneseSummary: string;
  stats: {
    strength: number;
    agility: number;
    intelligence: number;
    spirit: number;
  };
}
