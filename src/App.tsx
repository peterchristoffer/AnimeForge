import React, { useState, useRef, useEffect, createContext, useContext, Component } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Upload, 
  Download, 
  RefreshCw, 
  User as UserIcon, 
  Palette, 
  Sword, 
  Zap, 
  Brain, 
  Heart,
  Camera,
  X,
  Type as TypeIcon,
  Image as ImageIcon,
  Check,
  Quote,
  Gamepad2,
  Trophy,
  Target,
  Shield,
  Info,
  LogOut,
  LogIn,
  History,
  AlertCircle,
  User,
  Users,
  MessageSquare,
  TrendingUp,
  Heart as HeartOutline,
  BookOpen
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { cn } from './lib/utils';
import { compressImage } from './lib/imageUtils';
import { CharacterData, GeneratedCharacter, AnimeStyle } from './types';
import { generateCharacterImage, generateCharacterStory, editCharacterImage, generateMangaStory } from './services/aiService';
import { 
  auth, 
  db, 
  googleProvider, 
  handleFirestoreError, 
  OperationType, 
  FirebaseUser,
  Timestamp
} from './firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  collection, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  deleteDoc,
  collectionGroup,
  writeBatch,
  increment
} from 'firebase/firestore';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends Component<any, any> {
  props: any;
  state: any;

  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-dark flex items-center justify-center p-6 text-center">
          <div className="anime-panel max-w-md space-y-6">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-display font-black text-white uppercase italic">Something went wrong</h2>
            <p className="text-slate-400">
              {this.state.error?.message?.startsWith('{') 
                ? "A database error occurred. Please check your connection."
                : "An unexpected error occurred. Please refresh the page."}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="anime-button w-full bg-brand-blue text-white"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Auth Context
const AuthContext = createContext<{
  user: FirebaseUser | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Sync user to Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        try {
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            email: firebaseUser.email,
            lastLogin: serverTimestamp(),
            role: 'user'
          }, { merge: true });
        } catch (error) {
          console.error("Failed to sync user to Firestore:", error);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
      alert("Inloggning misslyckades. Försök igen.");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

const STYLES: AnimeStyle[] = [
  'Shonen', 'Shojo', 'Seinen', 'Cyberpunk', 'Fantasy', 'Ghibli-esque', 
  'Mecha', 'Horror', 'Slice of Life', 'Isekai', 'Retro 90s', 'Ukiyo-e'
];

const CLOTHING_STYLES = [
  'Cyberpunk Techwear',
  'Traditional Samurai Armor',
  'Modern Streetwear',
  'Gothic Lolita',
  'Steampunk Explorer',
  'High School Uniform',
  'Fantasy Mage Robes',
  'Futuristic Pilot Suit',
  'Ninja Stealth Gear',
  'Royal Formal Wear'
];
const SIZES: CharacterData['imageSize'][] = ['1K', '2K', '4K'];

const ENVIRONMENTS = [
  'Neon Tokyo (Cyberpunk City)',
  'Floating Islands (Fantasy Realm)',
  'Ancient Temple (Traditional Japan)',
  'Post-Apocalyptic Wasteland',
  'Magical Academy (School Setting)',
  'Deep Space Station (Sci-Fi)'
];

const INITIAL_STATE: CharacterData = {
  name: '',
  gender: 'Male',
  style: 'Shonen',
  clothingStyle: 'Modern Streetwear',
  features: {
    hairColor: 'Black',
    eyeColor: 'Blue',
    outfit: 'School Uniform',
    accessory: 'None'
  },
  personality: '',
  environment: '',
  imageSize: '1K'
};

export default function App() {
  const { user, login, logout, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1); // 1: Form, 2: Loading, 3: Result, 4: History
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [history, setHistory] = useState<GeneratedCharacter[]>([]);
  const [communityCharacters, setCommunityCharacters] = useState<GeneratedCharacter[]>([]);
  const [selectedForStory, setSelectedForStory] = useState<GeneratedCharacter[]>([]);
  const [generatedStory, setGeneratedStory] = useState<{ title: string; content: string } | null>(null);
  const [generatingStory, setGeneratingStory] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [storyGenre, setStoryGenre] = useState('Shonen');
  const [storySetting, setStorySetting] = useState('Futuristic Tokyo');
  const [storyTwist, setStoryTwist] = useState('None');
  const [storyLength, setStoryLength] = useState('Medium');
  const storyRef = useRef<HTMLDivElement>(null);

  const downloadStory = async () => {
    if (storyRef.current) {
      const canvas = await html2canvas(storyRef.current, {
        useCORS: true,
        backgroundColor: '#020617',
        scale: 2
      });
      const link = document.createElement('a');
      link.download = `${generatedStory?.title || 'manga-story'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Listen for user's characters
  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    const q = query(
      collection(db, 'characters'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chars = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GeneratedCharacter[];
      setHistory(chars);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'characters');
    });

    return () => unsubscribe();
  }, [user]);

  const [characterData, setCharacterData] = useState<CharacterData>(() => {
    const saved = localStorage.getItem('animeforge_draft');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  // Persist data to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('animeforge_draft', JSON.stringify(characterData));
  }, [characterData]);
  const [result, setResult] = useState<GeneratedCharacter | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const generateRef = useRef<() => void>(() => {});

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const compressed = await compressImage(base64, 600, 0.6);
          setCharacterData(prev => ({ ...prev, photoBase64: compressed }));
        } catch (error) {
          console.error("Failed to compress uploaded photo:", error);
          setCharacterData(prev => ({ ...prev, photoBase64: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!characterData.name) return showToast('Please give your character a name!', 'info');
    
    if (!user) {
      login();
      return;
    }

    setLoading(true);
    try {
      const rawImageUrl = await generateCharacterImage(characterData);
      const imageUrl = await compressImage(rawImageUrl, 800, 0.7);
      const { story, stats, coolName, japaneseSummary } = await generateCharacterStory(characterData);
      
      const newChar: Omit<GeneratedCharacter, 'id'> = {
        userId: user.uid,
        name: coolName,
        imageUrl,
        story,
        stats,
        japaneseSummary,
        createdAt: serverTimestamp(),
        isPublic: false
      };

      const docRef = await addDoc(collection(db, 'characters'), newChar);
      
      setResult({ 
        id: docRef.id,
        ...newChar,
        createdAt: new Date() // Local preview
      });
      
      // Update character name to the cool version
      setCharacterData(prev => ({ ...prev, name: coolName }));
      setStep(3);
    } catch (error: any) {
      console.error(error);
      handleFirestoreError(error, OperationType.CREATE, 'characters');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!result || !editPrompt || !result.id) return;
    setEditing(true);
    try {
      const rawImageUrl = await editCharacterImage(result.imageUrl, editPrompt);
      const newImageUrl = await compressImage(rawImageUrl, 800, 0.7);
      
      // Update in Firestore
      const charRef = doc(db, 'characters', result.id);
      await updateDoc(charRef, { imageUrl: newImageUrl });
      
      setResult(prev => prev ? { ...prev, imageUrl: newImageUrl } : null);
      setEditPrompt('');
    } catch (error: any) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, `characters/${result.id}`);
    } finally {
      setEditing(false);
    }
  };

  // Fetch community characters
  useEffect(() => {
    const q = query(
      collection(db, 'characters'),
      where('isPublic', '==', true),
      orderBy('likesCount', 'desc'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GeneratedCharacter));
      setCommunityCharacters(chars);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'characters');
    });

    return () => unsubscribe();
  }, []);

  // Fetch user's liked characters using collection group query
  useEffect(() => {
    if (!user) {
      setLikedIds(new Set());
      return;
    }

    const q = query(
      collectionGroup(db, 'likes'),
      where('uid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liked = new Set<string>();
      snapshot.docs.forEach((likeDoc) => {
        // The parent of the 'likes' collection is the character document
        const characterId = likeDoc.ref.parent.parent?.id;
        if (characterId) {
          liked.add(characterId);
        }
      });
      setLikedIds(liked);
    }, (error) => {
      console.error("Failed to fetch liked IDs:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLike = async (characterId: string) => {
    if (!user) {
      login();
      return;
    }

    const characterRef = doc(db, 'characters', characterId);
    const likeRef = doc(db, 'characters', characterId, 'likes', user.uid);
    const batch = writeBatch(db);

    try {
      if (likedIds.has(characterId)) {
        batch.delete(likeRef);
        batch.update(characterRef, {
          likesCount: increment(-1)
        });
      } else {
        batch.set(likeRef, { uid: user.uid, createdAt: serverTimestamp() });
        batch.update(characterRef, {
          likesCount: increment(1)
        });
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `characters/${characterId}/likes`);
    }
  };

  const forgeMangaStory = async () => {
    if (selectedForStory.length === 0) return;
    setGeneratingStory(true);
    setStep(6);

    try {
      const characterProfiles = selectedForStory.map(c => `Name: ${c.name}\nBackstory: ${c.story}\nStats: ${JSON.stringify(c.stats)}`).join('\n\n---\n\n');
      
      const prompt = `Generate an epic manga-style story involving the following ${selectedForStory.length} characters. 
      Weave their backstories and destinies together into a single coherent narrative. 
      
      Genre/Tone: ${storyGenre}
      Setting: ${storySetting}
      Plot Twist: ${storyTwist !== 'None' ? storyTwist : 'Surprise me with a dramatic turn of events'}
      Length: ${storyLength} (Short: ~300 words, Medium: ~600 words, Long: ~1200 words)
      
      The story should be dramatic, full of action, and emotional, matching the chosen genre, setting, and length.
      
      Characters:
      ${characterProfiles}
      
      Return the response in JSON format with "title" and "content" fields.`;

      const storyData = await generateMangaStory(prompt);
      setGeneratedStory(storyData);

      // Save story to Firestore
      if (user) {
        await addDoc(collection(db, 'mangaStories'), {
          userId: user.uid,
          title: storyData.title,
          content: storyData.content,
          characterIds: selectedForStory.map(c => c.id),
          createdAt: serverTimestamp()
        });
      }
      showToast('Chronicle forged and saved!', 'success');
    } catch (error) {
      console.error("Failed to generate manga story:", error);
      showToast('Failed to weave the destinies. Try again.', 'error');
    } finally {
      setGeneratingStory(false);
    }
  };

  const toggleCharacterSelection = (char: GeneratedCharacter) => {
    setSelectedForStory(prev => {
      if (prev.find(c => c.id === char.id)) {
        return prev.filter(c => c.id !== char.id);
      }
      if (prev.length >= 5) return prev;
      return [...prev, char];
    });
  };
  const handlePublish = async () => {
    if (!result || !result.id) return;
    setPublishing(true);
    try {
      const charRef = doc(db, 'characters', result.id);
      await updateDoc(charRef, { isPublic: true });
      setResult(prev => prev ? { ...prev, isPublic: true } : null);
      showToast('Character published to community!', 'success');
    } catch (error: any) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, `characters/${result.id}`);
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'characters', id));
      showToast('Character deleted.', 'info');
      setShowDeleteConfirm(null);
      if (result?.id === id) {
        setResult(null);
        setStep(1);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `characters/${id}`);
    }
  };

  const downloadCard = async () => {
    if (cardRef.current) {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        backgroundColor: null,
        scale: 2
      });
      const link = document.createElement('a');
      link.download = `${characterData.name}-trading-card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const resetForm = () => {
    setCharacterData({
      name: '',
      gender: 'Male',
      style: 'Shonen',
      clothingStyle: 'Modern Streetwear',
      features: {
        hairColor: 'Black',
        eyeColor: 'Blue',
        outfit: 'School Uniform',
        accessory: 'None'
      },
      personality: '',
      environment: '',
      imageSize: '1K'
    });
    setResult(null);
    setStep(1);
    localStorage.removeItem('animeforge_draft');
  };

  return (
    <div className="min-h-screen bg-brand-dark text-slate-200 selection:bg-blue-500 relative overflow-hidden">
      {/* Epic Background Image */}
      <div 
        className="fixed inset-0 z-0 opacity-20 pointer-events-none"
        style={{ 
          backgroundImage: 'url("https://storage.googleapis.com/aistudio-preview-uploads/image_1740907984813_0.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Animated Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[160px] rounded-full pointer-events-none animate-pulse" style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)' }} />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] blur-[160px] rounded-full pointer-events-none animate-pulse delay-700" style={{ backgroundColor: 'rgba(244, 63, 94, 0.03)' }} />
      
      {/* Header */}
      <header className="border-b border-slate-800/40 backdrop-blur-xl sticky top-0 z-50" style={{ backgroundColor: 'rgba(2, 6, 23, 0.7)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center rotate-3 shadow-lg shadow-brand-blue/20 flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="font-display font-bold text-lg sm:text-xl tracking-tight text-white uppercase italic neon-text truncate">AnimeForge</h1>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-8">
              <div className="hidden lg:flex items-center gap-3">
                {[1, 2, 3].map((s) => (
                  <div 
                    key={s}
                    className={cn(
                      "w-10 h-1 rounded-full transition-all duration-700",
                      step >= s ? "bg-brand-blue" : "bg-slate-800/60"
                    )}
                  />
                ))}
              </div>
              
              <div className="h-8 w-px bg-slate-800 hidden lg:block" />

              <div className="flex items-center gap-3 sm:gap-6">
                <button 
                  onClick={() => setStep(6)}
                  className={cn(
                    "text-[10px] sm:text-sm font-bold transition-colors flex items-center gap-1 sm:gap-2 uppercase tracking-widest",
                    step === 6 ? "text-brand-blue" : "text-slate-400 hover:text-white"
                  )}
                  title="Story Forge"
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Story Forge</span>
                </button>
                <button 
                  onClick={() => {
                    setStep(1);
                    setCharacterData(INITIAL_STATE);
                    setResult(null);
                  }}
                  className={cn(
                    "text-[10px] sm:text-sm font-bold transition-colors flex items-center gap-1 sm:gap-2 uppercase tracking-widest",
                    step === 1 ? "text-brand-blue" : "text-slate-400 hover:text-white"
                  )}
                  title="Forge"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">Forge</span>
                </button>
                <button 
                  onClick={() => setStep(4)}
                  className={cn(
                    "text-[10px] sm:text-sm font-bold transition-colors flex items-center gap-1 sm:gap-2 uppercase tracking-widest",
                    step === 4 ? "text-brand-blue" : "text-slate-400 hover:text-white"
                  )}
                  title="Collection"
                >
                  <History className="w-4 h-4" />
                  <span className="hidden sm:inline">Collection</span>
                </button>

                {user ? (
                  <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-slate-800">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-slate-700 flex-shrink-0">
                      <img src={user.photoURL || ''} alt="" className="w-full h-full object-cover" />
                    </div>
                    <button 
                      onClick={logout}
                      className="text-slate-400 hover:text-brand-accent transition-colors"
                      title="Logga ut"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={login}
                    className="anime-button px-3 sm:px-6 py-2 text-[10px] sm:text-xs"
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:inline">Login</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
          <AnimatePresence mode="wait">
            {step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto space-y-12"
              >
                <div className="text-center space-y-4">
                  <h2 className="text-3xl sm:text-5xl font-display font-black text-white uppercase italic tracking-tighter">Manga Story Forge</h2>
                  <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[8px] sm:text-[10px]">Weave the destinies of your chosen legends</p>
                </div>

                {!generatedStory && !generatingStory && (
                  <div className="anime-panel space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Selected Characters ({selectedForStory.length}/5)</h3>
                        <button 
                          onClick={() => setStep(4)}
                          className="text-brand-blue text-[10px] font-bold uppercase tracking-widest hover:underline"
                        >
                          Add More from Collection
                        </button>
                      </div>
                      
                      {selectedForStory.length === 0 ? (
                        <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                          <p className="text-slate-500 text-sm">No characters selected. Go to your collection to pick your cast!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                          {selectedForStory.map(char => (
                            <div key={char.id} className="relative group">
                              <div className="aspect-square rounded-xl overflow-hidden border border-slate-800 group-hover:border-brand-blue transition-all">
                                <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                              </div>
                              <button 
                                onClick={() => toggleCharacterSelection(char)}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <p className="text-[10px] font-bold text-white mt-2 text-center truncate">{char.name}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Genre / Tone</label>
                        <select 
                          value={storyGenre}
                          onChange={(e) => setStoryGenre(e.target.value)}
                          className="anime-input py-3 text-xs"
                        >
                          <option value="Shonen (Action/Adventure)">Shonen (Action)</option>
                          <option value="Shojo (Romance/Drama)">Shojo (Romance)</option>
                          <option value="Seinen (Dark/Psychological)">Seinen (Dark)</option>
                          <option value="Isekai (Other World)">Isekai (Fantasy)</option>
                          <option value="Slice of Life">Slice of Life</option>
                          <option value="Horror / Supernatural">Horror</option>
                          <option value="Mecha (Giant Robots)">Mecha</option>
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Setting</label>
                        <select 
                          value={storySetting}
                          onChange={(e) => setStorySetting(e.target.value)}
                          className="anime-input py-3 text-xs"
                        >
                          <option value="Futuristic Tokyo">Futuristic Tokyo</option>
                          <option value="Medieval Fantasy Kingdom">Medieval Fantasy</option>
                          <option value="Post-Apocalyptic Wasteland">Post-Apocalyptic</option>
                          <option value="Modern High School">High School</option>
                          <option value="Deep Space Station">Deep Space</option>
                          <option value="Ancient Samurai Era">Ancient Samurai</option>
                          <option value="Cyberpunk Underworld">Cyberpunk Underworld</option>
                          <option value="Floating Sky Islands">Floating Sky Islands</option>
                          <option value="Underwater Civilization">Underwater City</option>
                          <option value="Spirit Realm">Spirit Realm</option>
                          <option value="Magical Academy">Magical Academy</option>
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Plot Twist</label>
                        <select 
                          value={storyTwist}
                          onChange={(e) => setStoryTwist(e.target.value)}
                          className="anime-input py-3 text-xs"
                        >
                          <option value="None">Surprise Me</option>
                          <option value="A shocking betrayal">Betrayal</option>
                          <option value="A hidden forbidden power">Hidden Power</option>
                          <option value="A long-lost relative appears">Lost Relative</option>
                          <option value="A heroic sacrifice">Sacrifice</option>
                          <option value="A character is a double agent">Double Agent</option>
                          <option value="The world is a simulation">Simulation</option>
                          <option value="A time travel loop">Time Loop</option>
                          <option value="The villain is a future version of the hero">Future Villain</option>
                          <option value="A long-dormant god awakens">God Awakens</option>
                          <option value="The magic is actually technology">Tech-Magic</option>
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Story Length</label>
                        <select 
                          value={storyLength}
                          onChange={(e) => setStoryLength(e.target.value)}
                          className="anime-input py-3 text-xs"
                        >
                          <option value="Short">Short (~300 words)</option>
                          <option value="Medium">Medium (~600 words)</option>
                          <option value="Long">Long (~1200 words)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={forgeMangaStory}
                      disabled={selectedForStory.length < 1 || generatingStory}
                      className="anime-button w-full bg-brand-blue text-white shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingStory ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                      Forge Epic Narrative
                    </button>
                  </div>
                )}

                {generatingStory && (
                  <div className="anime-panel flex flex-col items-center justify-center py-24 space-y-8">
                    <div className="relative">
                      <div className="w-24 h-24 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
                      <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-brand-blue animate-pulse" />
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-display font-black text-white uppercase italic">Weaving Destinies...</h3>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">The chronicle is being written in the stars</p>
                    </div>
                  </div>
                )}

                {generatedStory && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-8"
                  >
                    <div className="anime-panel space-y-8 overflow-hidden relative" ref={storyRef}>
                      {/* Manga Background Elements for Export */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/5 blur-[100px] -z-10" />
                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-accent/5 blur-[100px] -z-10" />
                      
                      <div className="space-y-2 text-center">
                        <h3 className="text-4xl font-display font-black text-white uppercase italic tracking-tighter">{generatedStory.title}</h3>
                        <div className="h-1.5 w-32 bg-brand-blue rounded-full mx-auto" />
                      </div>
                      
                      <div className="relative">
                        <Quote className="absolute -left-6 -top-6 w-16 h-16 text-slate-800 -z-10" />
                        <div className="prose prose-invert max-w-none">
                          <p className="text-slate-300 leading-relaxed text-xl font-medium italic first-letter:text-5xl first-letter:font-black first-letter:text-brand-blue first-letter:mr-3 first-letter:float-left">
                            {generatedStory.content}
                          </p>
                        </div>
                      </div>

                      {/* Cast List in Story */}
                      <div className="pt-8 border-t border-slate-800/40">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Featuring the Legends:</p>
                        <div className="flex flex-wrap gap-4">
                          {selectedForStory.map(char => (
                            <div key={`cast-${char.id}`} className="flex items-center gap-3 bg-slate-900/50 px-3 py-2 rounded-xl border border-slate-800">
                              <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700">
                                <img src={char.imageUrl} alt="" className="w-full h-full object-cover" />
                              </div>
                              <span className="text-xs font-bold text-white">{char.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={() => {
                          setGeneratedStory(null);
                          setSelectedForStory([]);
                        }}
                        className="anime-button flex-1 bg-slate-800 text-white hover:bg-slate-700"
                      >
                        <RefreshCw className="w-6 h-6" />
                        Forge Another
                      </button>
                      <button
                        onClick={downloadStory}
                        className="anime-button flex-1 bg-white text-slate-950 hover:bg-slate-100"
                      >
                        <Download className="w-6 h-6" />
                        Save Chronicle
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="space-y-8 sm:space-y-16"
            >
              <div className="text-center space-y-4">
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl sm:text-4xl md:text-6xl font-bold text-white tracking-tight"
                >
                  Forge Your <span className="text-brand-blue">Legend</span>
                </motion.h2>
                <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base font-medium leading-relaxed px-4">
                  The ultimate anime character creator. Upload a photo or design from scratch to create your unique trading card.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Basic Info */}
                <div className="anime-panel space-y-6 sm:space-y-8 p-4 sm:p-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-brand-blue" />
                      </div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Character Identity</label>
                    </div>
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="Enter Name..."
                        className="anime-input py-3 sm:py-4"
                        value={characterData.name}
                        onChange={e => setCharacterData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Gender Selection</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['Male', 'Female', 'Other'].map(g => (
                        <button
                          key={g}
                          onClick={() => setCharacterData(prev => ({ ...prev, gender: g as any }))}
                          className={cn(
                            "py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                            characterData.gender === g 
                              ? "bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20" 
                              : "bg-slate-950/40 border-slate-800/40 text-slate-500 hover:border-slate-700 hover:bg-slate-900/60"
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Art Style</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {STYLES.map(style => (
                        <button
                          key={style}
                          onClick={() => setCharacterData(prev => ({ ...prev, style }))}
                          className={cn(
                            "p-3 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all border text-center flex items-center justify-center min-h-[48px]",
                            characterData.style === style 
                              ? "bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20" 
                              : "bg-slate-950/40 border-slate-800/40 text-slate-500 hover:border-slate-700 hover:bg-slate-900/60"
                          )}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Clothing Style</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {CLOTHING_STYLES.map(style => (
                        <button
                          key={style}
                          onClick={() => setCharacterData(prev => ({ ...prev, clothingStyle: style }))}
                          className={cn(
                            "p-3 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all border text-center flex items-center justify-center min-h-[48px]",
                            characterData.clothingStyle === style 
                              ? "bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20" 
                              : "bg-slate-950/40 border-slate-800/40 text-slate-500 hover:border-slate-700 hover:bg-slate-900/60"
                          )}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Custom Aesthetic</label>
                    <input 
                      type="text"
                      placeholder="e.g. Neon Samurai, Space Pirate..."
                      className="anime-input py-3.5"
                      value={characterData.customStyle || ''}
                      onChange={e => setCharacterData(prev => ({ ...prev, customStyle: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Personality & Environment */}
                <div className="anime-panel space-y-6 sm:space-y-8 p-4 sm:p-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-brand-blue" />
                      </div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Backstory & Vibe</label>
                    </div>
                    <textarea 
                      placeholder="What's their mission? Their secret power? Describe their personality..."
                      className="anime-input h-32 resize-none py-4 leading-relaxed"
                      value={characterData.personality}
                      onChange={e => setCharacterData(prev => ({ ...prev, personality: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Environment Selection</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {ENVIRONMENTS.map((env) => (
                        <button
                          key={env}
                          onClick={() => setCharacterData(prev => ({ ...prev, environment: env }))}
                          className={cn(
                            "p-3 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all border text-center flex items-center justify-center min-h-[48px]",
                            characterData.environment === env
                              ? "bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20"
                              : "bg-slate-950/40 border-slate-800/40 text-slate-500 hover:border-slate-700 hover:bg-slate-900/60"
                          )}
                        >
                          {env}
                        </button>
                      ))}
                    </div>
                    <input 
                      type="text"
                      placeholder="Or describe a custom environment..."
                      className="anime-input py-3.5"
                      value={characterData.environment && !ENVIRONMENTS.includes(characterData.environment) ? characterData.environment : ''}
                      onChange={e => setCharacterData(prev => ({ ...prev, environment: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Visual Reference (Optional)</label>
                    {!characterData.photoBase64 ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative group">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div className="border border-dashed border-slate-800/60 rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-all h-32 bg-slate-950/20 group-hover:bg-slate-950/40 group-hover:border-slate-700">
                            <Upload className="w-6 h-6 text-slate-500 group-hover:text-brand-blue transition-colors" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-400">Upload File</span>
                          </div>
                        </div>

                        <div className="relative group">
                          <input 
                            type="file" 
                            accept="image/*"
                            capture="user"
                            onChange={handlePhotoUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div className="border border-dashed border-slate-800/60 rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-all h-32 bg-slate-950/20 group-hover:bg-slate-950/40 group-hover:border-slate-700">
                            <Camera className="w-6 h-6 text-slate-500 group-hover:text-brand-blue transition-colors" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-400">Use Camera</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-5 p-4 border rounded-xl bg-brand-blue/5 border-brand-blue/20"
                      >
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-brand-blue/20 shadow-lg">
                          <img src={characterData.photoBase64} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-brand-blue uppercase tracking-[0.15em] mb-1">Visual DNA Captured</p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-3">Reference image ready for forge</p>
                          <button 
                            onClick={() => setCharacterData(prev => ({ ...prev, photoBase64: undefined }))}
                            className="text-[9px] font-bold text-slate-400 hover:text-brand-accent transition-colors uppercase tracking-widest flex items-center gap-2"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Change Image
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-4 sm:pt-8">
                <button
                  onClick={handleGenerate}
                  disabled={loading || !characterData.name}
                  className="anime-button w-full max-w-md h-16 sm:h-20 text-lg sm:text-xl"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" />
                      Forging Legend...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" />
                      Generate Character
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && result && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 gap-12 items-start"
            >
              <div className="flex flex-col items-center gap-8">
                <div 
                  ref={cardRef}
                  className="w-full flex flex-col md:flex-row items-center justify-center gap-8 p-4 sm:p-8"
                >
                  {/* Front Side */}
                  <div className="w-full max-w-[380px] aspect-[2.5/3.5] min-h-[450px] sm:min-h-[532px] relative flex-shrink-0 z-10 shadow-2xl">
                    <div className="absolute inset-0 trading-card-container">
                      {/* Foil Border & Effects */}
                      <div className="card-foil-border" />
                      <div className="card-holographic" />
                      <div className="card-texture" />

                      {/* Card Header */}
                      <div 
                        className="absolute top-0 inset-x-0 h-24 z-10 px-6 pt-6 flex items-start justify-between"
                        style={{ background: 'linear-gradient(to bottom, rgba(2, 6, 23, 0.8) 0%, rgba(2, 6, 23, 0) 100%)' }}
                      >
                        <div className="space-y-0.5 max-w-[70%]">
                          <span className="graffiti-text text-white text-lg sm:text-xl tracking-widest uppercase block leading-none truncate">{characterData.name}</span>
                          <span className="text-[8px] font-bold text-brand-blue uppercase tracking-[0.3em]">Legendary Hero</span>
                        </div>
                        <div 
                          className="w-10 h-10 bg-gradient-to-br from-brand-blue to-blue-700 rounded-full flex items-center justify-center border shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          style={{ borderColor: 'rgba(255, 255, 255, 0.3)' }}
                        >
                          <Zap className="w-5 h-5 text-white fill-white" />
                        </div>
                      </div>

                      {/* Character Image */}
                      <div className="w-full h-full relative">
                        {editing && <div className="scanning-line" />}
                        <img 
                          src={result.imageUrl} 
                          alt={characterData.name}
                          className={cn("w-full h-full object-cover transition-opacity duration-500", editing ? "opacity-40" : "opacity-100")}
                          referrerPolicy="no-referrer"
                        />
                        <div 
                          className="absolute inset-0" 
                          style={{ background: 'linear-gradient(to top, rgba(2, 6, 23, 1) 0%, rgba(2, 6, 23, 0.4) 40%, rgba(2, 6, 23, 0) 100%)' }}
                        />
                      </div>

                      {/* Rarity Badge */}
                      <div className="absolute top-1/2 right-4 -translate-y-1/2 z-20 flex flex-col items-center gap-1">
                        <div className="w-0.5 h-8 bg-gradient-to-b from-transparent via-brand-blue to-transparent opacity-30" />
                        <span className="writing-mode-vertical text-[7px] font-bold text-brand-blue uppercase tracking-[0.4em] py-2">COLLECTIBLE</span>
                        <div className="w-0.5 h-8 bg-gradient-to-b from-transparent via-brand-blue to-transparent opacity-30" />
                      </div>

                      {/* Card Footer / Stats Overlay */}
                      <div 
                        className="absolute bottom-0 inset-x-0 p-6 pt-10"
                        style={{ background: 'linear-gradient(to top, rgba(2, 6, 23, 1) 0%, rgba(2, 6, 23, 0.9) 70%, rgba(2, 6, 23, 0) 100%)' }}
                      >
                        <div className="mb-4 relative">
                          <div className="absolute -left-2 top-0 w-0.5 h-full" style={{ backgroundColor: 'rgba(59, 130, 246, 0.3)' }} />
                          <p className="text-[8px] text-brand-blue font-bold tracking-[0.3em] uppercase mb-1 opacity-70">Origin Fragment</p>
                          <p className="text-[11px] text-slate-200 font-medium leading-relaxed line-clamp-2 italic">"{result.japaneseSummary}"</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-5">
                          {[
                            { label: 'STR', val: result.stats.strength, icon: Sword, color: 'bg-red-500' },
                            { label: 'AGI', val: result.stats.agility, icon: Zap, color: 'bg-yellow-500' },
                            { label: 'INT', val: result.stats.intelligence, icon: Brain, color: 'bg-blue-500' },
                            { label: 'SPI', val: result.stats.spirit, icon: Heart, color: 'bg-emerald-500' }
                          ].map((stat) => (
                            <div key={stat.label} className="space-y-1.5">
                              <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 tracking-widest">
                                <span className="flex items-center gap-1">
                                  <stat.icon className="w-3 h-3 text-slate-500" />
                                  {stat.label}
                                </span>
                                <span className="text-white">{stat.val}</span>
                              </div>
                              <div className="stat-bar-container">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${stat.val}%` }}
                                  className={cn("stat-bar-fill", stat.color)} 
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="pt-4 text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] flex justify-between items-center border-t" style={{ borderColor: 'rgba(30, 41, 59, 0.3)' }}>
                          <span className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-blue shadow-[0_0_6px_rgba(59,130,246,0.6)] animate-pulse" />
                            {characterData.style} EDITION
                          </span>
                          <span className="text-slate-600">AF-2026-{Math.floor(Math.random() * 9000) + 1000}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Back Side */}
                  <div className="w-full max-w-[380px] aspect-[2.5/3.5] min-h-[450px] sm:min-h-[532px] relative flex-shrink-0 z-10 shadow-2xl">
                    <div className="absolute inset-0 trading-card-container p-6 flex flex-col justify-between">
                      <div className="card-foil-border opacity-20" />
                      <div className="card-texture" />
                      
                      <div className="space-y-4 relative z-10">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5 max-w-[70%]">
                            <h3 className="graffiti-text text-brand-blue text-xl sm:text-2xl tracking-widest uppercase block leading-none truncate">{characterData.name}</h3>
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em]">Chronicle Data</p>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-brand-blue" />
                          </div>
                        </div>
                        
                        <div className="h-1 w-12 bg-gradient-to-r from-brand-blue to-transparent rounded-full" />
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Info className="w-3.5 h-3.5 text-brand-blue" />
                            <p className="text-[8px] text-brand-blue font-bold tracking-[0.3em] uppercase">The Legend</p>
                          </div>
                          <div className="max-h-[280px] sm:max-h-[350px] overflow-y-auto pr-3 custom-scrollbar">
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium italic opacity-80">
                              {result.story}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t flex items-center justify-between relative z-10" style={{ borderColor: 'rgba(30, 41, 59, 0.3)' }}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-slate-600" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">Creator</p>
                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest truncate max-w-[80px]">{user?.displayName || 'Anonymous'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">Forged</p>
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                            {new Date().toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col w-full max-w-2xl gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={downloadCard}
                      className="anime-button w-full bg-white text-slate-950 hover:bg-slate-100 shadow-2xl"
                    >
                      <Download className="w-6 h-6" />
                      Download Cards
                    </button>
                    
                    <button
                      onClick={handlePublish}
                      disabled={publishing}
                      className="anime-button w-full bg-brand-blue text-white shadow-2xl"
                      style={{ backgroundColor: publishing ? 'rgba(59, 130, 246, 0.9)' : 'rgb(59, 130, 246)' }}
                    >
                      {publishing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                      Publish to Community
                    </button>
                  </div>

                  <button
                    onClick={resetForm}
                    className="anime-button w-full bg-slate-900 text-slate-400 hover:text-white border-2 border-slate-800 hover:border-brand-blue"
                  >
                    <Sparkles className="w-6 h-6" />
                    Forge New Legend
                  </button>
                </div>
              </div>

                <div className="anime-panel space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                        <Palette className="w-6 h-6 text-brand-blue" />
                        Refine Legend
                      </h4>
                      <p className="text-sm font-medium text-slate-500">Evolve your character's appearance with AI</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-4 rounded-2xl border-2 border-slate-800 custom-scrollbar"
                         style={{ backgroundColor: 'rgba(2, 6, 23, 0.5)' }}
                    >
                      {[
                        'Add glowing eyes', 'Add mechanical arm', 'Add dragon wings', 'Add lightning sparks', 
                        'Add cat ears', 'Add samurai sword', 'Add futuristic headset', 'Add magical staff', 
                        'Add fire aura', 'Add robotic pet', 'Add cape', 'Add facial scars', 
                        'Add tattoos', 'Add floating crystals', 'Add demon horns', 'Add halo', 
                        'Add dual pistols', 'Add ninja mask', 'Add steampunk goggles', 'Add cherry blossom petals',
                        'Add retro filter', 'Make it nighttime', 'Add glowing aura', 'Change to winter outfit'
                      ].map(suggestion => (
                        <button
                          key={suggestion}
                          onClick={() => setEditPrompt(prev => prev ? `${prev}, ${suggestion}` : suggestion)}
                          className="px-4 py-2 bg-slate-800 hover:bg-brand-blue hover:text-white text-slate-400 rounded-full text-xs font-black uppercase tracking-widest transition-all border-2 border-slate-700 hover:border-brand-blue"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <input 
                        type="text"
                        placeholder="e.g. Add a red scarf..."
                        className="anime-input flex-1"
                        value={editPrompt}
                        onChange={e => setEditPrompt(e.target.value)}
                      />
                      <button
                        onClick={handleEdit}
                        disabled={editing || !editPrompt}
                        className="anime-button px-10"
                      >
                        {editing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 mb-12">
                <div className="space-y-2">
                  <h2 className="text-4xl font-bold text-white tracking-tight">Hall of <span className="text-brand-blue">Legends</span></h2>
                  <p className="text-slate-500 text-sm font-medium">Your collection of forged characters</p>
                </div>
                <button 
                  onClick={() => setStep(1)}
                  className="anime-button bg-slate-800/50 text-white hover:bg-slate-800 sm:w-auto px-6 py-3 text-xs"
                >
                  <Sparkles className="w-4 h-4" />
                  Forge New
                </button>
              </div>

              {history.length === 0 ? (
                <div className="anime-panel flex flex-col items-center justify-center py-32 text-center border-dashed">
                  <div className="w-20 h-20 rounded-2xl bg-slate-900/50 flex items-center justify-center mb-8 border border-slate-800/60">
                    <History className="w-10 h-10 text-slate-700" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">The Hall is Empty</h3>
                  <p className="text-slate-500 max-w-xs mx-auto leading-relaxed">Your legendary journey hasn't begun yet. Start forging your first character!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {history.map((char) => (
                    <motion.div
                      key={char.id}
                      layoutId={char.id}
                      className="anime-panel p-0 overflow-hidden group cursor-pointer border-slate-800/40 hover:border-brand-blue/30 transition-all duration-500"
                      onClick={() => {
                        setResult(char);
                        setCharacterData(prev => ({ ...prev, name: char.name }));
                        setStep(3);
                      }}
                    >
                      <div className="aspect-[4/5] relative overflow-hidden">
                        <img 
                          src={char.imageUrl} 
                          alt={char.name}
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent opacity-80" />
                        <div className="absolute bottom-0 inset-x-0 p-6">
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-[7px] font-bold text-brand-blue uppercase tracking-[0.2em]">
                              {char.style}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (char.id) setShowDeleteConfirm(char.id);
                              }}
                              className="text-slate-500 hover:text-red-500 transition-colors p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-brand-blue transition-colors truncate">{char.name}</h3>
                          <div className="flex items-center gap-2 mt-3">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCharacterSelection(char);
                              }}
                              className={cn(
                                "flex-1 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all",
                                selectedForStory.find(c => c.id === char.id)
                                  ? "bg-brand-blue text-white"
                                  : "bg-slate-900 border border-slate-800 text-slate-500 hover:text-white"
                              )}
                            >
                              {selectedForStory.find(c => c.id === char.id) ? 'Selected' : 'Select for Story'}
                            </button>
                          </div>
                          <div className="flex items-center gap-3 mt-3">
                            <div className="h-px flex-1 bg-slate-800/60" />
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                              {char.createdAt?.seconds 
                                ? new Date(char.createdAt.seconds * 1000).toLocaleDateString()
                                : 'Legendary'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-16 sm:mt-32 border-t py-8 sm:py-12 relative overflow-hidden"
              style={{ backgroundColor: 'rgba(2, 6, 23, 0.3)', borderColor: 'rgba(30, 41, 59, 0.3)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center space-y-6 relative z-10">
          <div className="flex justify-center gap-4 sm:gap-8">
            {[Zap, Heart, Sparkles, Sword, Brain].map((Icon, i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: i * 0.8 }}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-800 hover:text-brand-blue transition-colors cursor-pointer" />
              </motion.div>
            ))}
          </div>
          <div className="space-y-1">
            <h5 className="font-display font-bold text-base sm:text-lg text-white uppercase tracking-widest">AnimeForge v2.0</h5>
            <p className="text-slate-600 text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.3em]">Built for the next generation of Otaku</p>
          </div>
          <div className="flex justify-center gap-4">
            <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[8px] font-bold text-slate-600 uppercase tracking-widest">
              Powered by Gemini AI
            </div>
          </div>
        </div>
      </footer>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="anime-panel max-w-sm w-full p-8 text-center space-y-6 border-red-500/30"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto border border-red-500/20">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white tracking-tight">Erase Legend?</h3>
                <p className="text-slate-500 text-sm leading-relaxed">This action is permanent. Your character will be lost to the void forever.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-6 py-3 rounded-xl bg-slate-900 text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="flex-1 px-6 py-3 rounded-xl bg-red-500 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={cn(
              "fixed bottom-10 left-1/2 z-[100] px-6 py-3 rounded-full font-black uppercase tracking-widest text-xs shadow-2xl border-2",
              toast.type === 'error' ? "bg-red-500 text-white border-red-400" :
              toast.type === 'success' ? "bg-emerald-500 text-white border-emerald-400" :
              "bg-brand-blue text-white"
            )}
            style={{ borderColor: toast?.type === 'info' ? 'rgba(59, 130, 246, 0.5)' : undefined }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
