import React, { useState, useEffect, useRef } from "react";
import { Upload, Camera, Sparkles, Check, ChevronRight, ChevronLeft, AlertCircle, RefreshCw, X } from "lucide-react";
import { Link } from "react-router";

type Screen = "welcome" | "questionnaire" | "loading" | "results" | "returning";
type QuestionnaireStep = 1 | 2 | 3 | 4;

interface Answer {
  [key: string]: string | string[];
}

// 🧬 The Centralized Product Matrix for AI Classified Skin Conditions
const AI_PRODUCT_RECOMMENDATIONS: Record<string, { 
  type: 'cosmetic' | 'medical';
  routine: string; 
  ingredients: string;
  suggestions: string[]; 
}> = {
  acne: {
    type: 'cosmetic',
    routine: 'Focus on clearing deep pores and regulating excess sebum production.',
    ingredients: 'Salicylic Acid (BHA), Benzoyl Peroxide, Niacinamide.',
    suggestions: ['COSRX Salicylic Acid Daily Gentle Cleanser', 'Bioderma Sebium Kerato+ Gel-Cream']
  },
  seborrheic_keratosis: {
    type: 'cosmetic',
    routine: 'Soften the hardened, thick keratin buildup to smooth out surface texture.',
    ingredients: 'Urea, Glycolic Acid (AHA), Salicylic Acid.',
    suggestions: ['CeraVe SA Smoothing Cream (10% Urea)', 'Paula\'s Choice Skin Perfecting 2% BHA Liquid']
  },
  pigmented_benign_keratosis: {
    type: 'cosmetic',
    routine: 'Gently promote surface cellular turnover while strictly preventing further sun-induced pigmentation.',
    ingredients: 'Retinol, Alpha Arbutin, Broad-Spectrum SPF 50+.',
    suggestions: ['La Roche-Posay Anthelios UVMune 400', 'The Ordinary Alpha Arbutin 2% + HA']
  },
  actinic_keratosis: {
    type: 'medical',
    routine: 'This is a pre-cancerous sun-induced lesion. Avoid raw chemical scrubs completely and protect the barrier.',
    ingredients: 'High-protection physical sunscreens, soothing Ceramides.',
    suggestions: ['Requires Dermatologist Evaluation', 'Apply Broad-Spectrum SPF 50+ Daily']
  },
  nevus: {
    type: 'cosmetic',
    routine: 'Benign common mole structure. No cosmetic intervention needed. Protect with high sun defense.',
    ingredients: 'Zinc Oxide, Titanium Dioxide (Mineral SPF).',
    suggestions: ['Isdin Eryfotona Actinica Mineral SPF 50+']
  },
  dermatofibroma: {
    type: 'cosmetic',
    routine: 'Benign deep skin nodule. Topicals cannot eliminate firm nodules. Maintain clean surface hydration.',
    ingredients: 'Hyaluronic Acid, Glycerin, Gentle Ceramides.',
    suggestions: ['CeraVe Moisturizing Cream']
  },
  vascular_lesion: {
    type: 'cosmetic',
    routine: 'Deep blood vessel structures. Topicals cannot eliminate them completely but can calm flushing or surface redness.',
    ingredients: 'Centella Asiatica (Cica), Niacinamide, Azelaic Acid.',
    suggestions: ['Dr.Jart+ Cicapair Tiger Grass Color Correcting Treatment']
  },
  melanoma: {
    type: 'medical',
    routine: 'High Alert: Structural properties align closely with clinical malignant melanoma criteria.',
    ingredients: 'Immediate medical inspection required.',
    suggestions: ['Urgent: Schedule a professional evaluation with a certified Dermatologist immediately.', 'Do not attempt to treat or exfoliate this lesion using over-the-counter products.']
  },
  basal_cell_carcinoma: {
    type: 'medical',
    routine: 'High Alert: Structural properties align closely with basal cell carcinoma indications.',
    ingredients: 'Clinical surgical or medical removal required.',
    suggestions: ['Urgent: Schedule a professional evaluation with a certified Dermatologist immediately.']
  },
  squamous_cell_carcinoma: {
    type: 'medical',
    routine: 'High Alert: Structural properties align closely with squamous cell carcinoma indications.',
    ingredients: 'Clinical diagnostic verification required.',
    suggestions: ['Urgent: Schedule a professional evaluation with a certified Dermatologist immediately.']
  }
};

export function MishtiNew() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [currentStep, setCurrentStep] = useState<QuestionnaireStep>(1);
  const [answers, setAnswers] = useState<Answer>({});
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // 🛠️ Added to store raw file bytes
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [customIngredient, setCustomIngredient] = useState("");
  
  // 🛠️ Added real AI classification result states
  const [aiResults, setAiResults] = useState<{ conditions_detected: string[], confidence_scores: Record<string, number> } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🛠️ REWRITTEN: Now performs the actual live Render API request during the loading screen
  useEffect(() => {
    if (screen === "loading") {
      setLoadingProgress(1);
      
      let stepTimer = setInterval(() => {
        setLoadingProgress((prev) => (prev < 4 ? prev + 1 : prev));
      }, 600);

      const hitAiEngine = async () => {
        if (!selectedFile) {
          // Fallback if they skip the photo step
          setLoadingProgress(5);
          setTimeout(() => setScreen("results"), 400);
          return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
          const response = await fetch('https://rare-skin-backend.onrender.com/analyze', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) throw new Error('Live classification endpoint failed');

          const data = await response.json();
          setAiResults(data); // Inject real AI diagnostics into state
          setLoadingProgress(5);
          setTimeout(() => setScreen("results"), 400);
        } catch (error) {
          console.error('Handshake Error:', error);
          alert('Could not connect to the live AI engine. Making sure your Render backend service is fully awake!');
          setScreen("welcome");
          setLoadingProgress(0);
        }
      };

      hitAiEngine();

      return () => clearInterval(stepTimer);
    }
  }, [screen, selectedFile]);

  const handleAnswer = (questionId: string, value: string | string[], multiSelect = false) => {
    if (multiSelect) {
      const current = (answers[questionId] as string[]) || [];
      const newValue = current.includes(value as string)
        ? current.filter((v) => v !== value)
        : [...current, value as string];
      setAnswers({ ...answers, [questionId]: newValue });
    } else {
      setAnswers({ ...answers, [questionId]: value });
    }
  };

  const isSelected = (questionId: string, value: string) => {
    const answer = answers[questionId];
    if (Array.isArray(answer)) {
      return answer.includes(value);
    }
    return answer === value;
  };

  const handleContinue = () => {
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as QuestionnaireStep);
    } else {
      setScreen("loading");
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as QuestionnaireStep);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file); // 🛠️ Safely bundle binary data for submission
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        setPhotoUploaded(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setPhotoUploaded(false);
    setSelectedFile(null); // Clear raw file allocation
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddCustomIngredient = (questionId: string) => {
    if (customIngredient.trim()) {
      const current = (answers[questionId] as string[]) || [];
      if (!current.includes(customIngredient.trim())) {
        setAnswers({ ...answers, [questionId]: [...current, customIngredient.trim()] });
      }
      setCustomIngredient("");
    }
  };

  // 🛠️ Total State Resetter to handle scanning multiple times cleanly
  const handleResetWorkspace = () => {
    setAiResults(null);
    setAnswers({});
    setPhotoPreview(null);
    setPhotoUploaded(false);
    setSelectedFile(null);
    setCurrentStep(1);
    setLoadingProgress(0);
    setScreen("welcome");
  };

  // Welcome Screen
  if (screen === "welcome") {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6 py-24">
        <div className="max-w-lg w-full text-center">
          <div className="w-12 h-12 mx-auto mb-8 text-rose">
            <Sparkles size={48} strokeWidth={1.3} />
          </div>

          <h1 className="font-playfair text-4xl sm:text-5xl text-dark mb-6">
            Hi, I'm <em className="text-rose">Mishti</em>.
          </h1>

          <p className="text-mauve text-sm sm:text-base leading-relaxed mb-12 max-w-md mx-auto" style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}>
            Your personal skin guide. To begin, share a bare-faced photo in soft light.
            I'll keep it private — it's just for this moment.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {!photoPreview ? (
            <div
              onClick={handleUploadClick}
              className="border border-dashed border-gold rounded-2xl p-12 sm:p-20 mb-6 hover:border-rose transition-colors duration-300 cursor-pointer bg-cream"
            >
              <Camera size={32} className="text-rose mx-auto mb-4" strokeWidth={1.3} />
              <p className="text-gold text-[9px] uppercase tracking-[5px]" style={{ fontFamily: "Jost, sans-serif" }}>
                Upload your photo
              </p>
              <p className="text-mauve/60 text-xs mt-2" style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}>
                JPG or PNG, soft natural lighting
              </p>
            </div>
          ) : (
            <div className="relative border border-gold rounded-2xl p-6 mb-6 bg-cream">
              <button
                onClick={handleRemovePhoto}
                className="absolute top-4 right-4 w-8 h-8 bg-dark/80 hover:bg-dark rounded-full flex items-center justify-center text-cream transition-colors duration-300"
                aria-label="Remove photo"
              >
                <X size={16} strokeWidth={1.3} />
              </button>
              <img
                src={photoPreview}
                alt="Uploaded photo"
                className="w-48 h-48 object-cover rounded-full mx-auto"
              />
              <p className="text-gold text-[9px] uppercase tracking-[5px] mt-4" style={{ fontFamily: "Jost, sans-serif" }}>
                Photo uploaded
              </p>
              <button
                onClick={() => setScreen("questionnaire")}
                className="mt-6 bg-dark text-cream px-10 py-3 rounded-full text-[10px] uppercase tracking-[3px] hover:bg-terra transition-all duration-300"
                style={{ fontFamily: "Jost, sans-serif" }}
              >
                Continue to Questions
              </button>
            </div>
          )}

          <button
            onClick={() => setScreen("questionnaire")}
            className="text-rose text-sm hover:text-terra transition-colors duration-300"
            style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}
          >
            or continue with questionnaire only
          </button>
        </div>
      </div>
    );
  }

  // Questionnaire Screen
  if (screen === "questionnaire") {
    return (
      <div className="min-h-screen bg-cream px-6 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-12">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  step === currentStep ? "bg-rose w-8" : "bg-linen"
                }`}
              />
            ))}
          </div>

          <div className="text-center mb-12">
            <h2 className="font-playfair text-3xl sm:text-4xl text-dark mb-3">
              {currentStep === 1 && (<>Your Skin <em className="text-rose">Rhythm</em></>)}
              {currentStep === 2 && (<>Your Glow & <em className="text-rose">Flow</em></>)}
              {currentStep === 3 && (<>Skin <em className="text-rose">Language</em></>)}
              {currentStep === 4 && (<>Your Routine, <em className="text-rose">Your Way</em></>)}
            </h2>
            <p className="text-mauve text-sm" style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}>
              {currentStep === 1 && "Let's understand how your skin behaves throughout the day"}
              {currentStep === 2 && "Tell us about your skin tone, texture, and natural glow"}
              {currentStep === 3 && "Help us decode your skin's unique signals"}
              {currentStep === 4 && "Share your habits so we can personalize your ritual"}
            </p>
          </div>

          <div className="space-y-6 mb-12">
            <QuestionnaireContent
              step={currentStep}
              answers={answers}
              onAnswer={handleAnswer}
              isSelected={isSelected}
              customIngredient={customIngredient}
              setCustomIngredient={setCustomIngredient}
              onAddCustomIngredient={handleAddCustomIngredient}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            {currentStep > 1 ? (
              <button
                onClick={handleBack}
                className="border border-rose text-rose px-8 py-3 rounded-full text-[10px] uppercase tracking-[3px] hover:bg-rose/10 transition-all duration-300"
                style={{ fontFamily: "Jost, sans-serif" }}
              >
                <ChevronLeft size={14} className="inline mr-2" strokeWidth={1.3} />
                Back
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={handleContinue}
              className="bg-dark text-cream px-10 py-3 rounded-full text-[10px] uppercase tracking-[3px] hover:bg-terra transition-all duration-300"
              style={{ fontFamily: "Jost, sans-serif" }}
            >
              {currentStep === 4 ? "Complete" : "Continue"}
              <ChevronRight size={14} className="inline ml-2" strokeWidth={1.3} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading Screen
  if (screen === "loading") {
    const steps = [
      "Accessing dynamic AI diagnostic core...",
      "Extracting pixel structural vectors...",
      "Analyzing dermal boundaries...",
      "Evaluating diagnostic profiles...",
      "Finalising product rituals...",
    ];

    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-48 h-48 mx-auto mb-8 rounded-full bg-rose/5 flex items-center justify-center">
            <Sparkles size={64} className="text-rose animate-pulse" strokeWidth={1.3} />
          </div>

          <h2 className="font-playfair text-3xl text-dark mb-12">
            Mishti is computing your <em className="text-rose">skin profile</em>…
          </h2>

          <div className="space-y-4 text-left max-w-xs mx-auto">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 transition-opacity duration-500 ${
                  index < loadingProgress ? "opacity-100" : "opacity-40"
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  index < loadingProgress ? "bg-rose" : "border border-rose/30"
                }`}>
                  {index < loadingProgress && (
                    <Check size={12} className="text-cream" strokeWidth={2} />
                  )}
                </div>
                <span className="text-mauve text-sm" style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Results Dashboard
  if (screen === "results") {
    return (
      <ResultsDashboard aiResults={aiResults} onReset={handleResetWorkspace} answers={answers} />
    );
  }

  return null;
}

// Questionnaire Content Component (Unchanged)
function QuestionnaireContent({
  step,
  answers,
  onAnswer,
  isSelected,
  customIngredient,
  setCustomIngredient,
  onAddCustomIngredient,
}: any) {
  const Question = ({ id, text, options, type = "single", note, showCustomInput }: any) => {
    const currentAnswers = (answers[id] as string[]) || [];
    const customAnswers = currentAnswers.filter((ans) => !options.includes(ans));

    return (
      <div className="bg-linen rounded-2xl p-6 sm:p-8">
        <p className="text-gold text-[9px] uppercase tracking-[5px] mb-2" style={{ fontFamily: "Jost, sans-serif" }}>
          {id}
        </p>
        <h3 className="font-playfair text-xl text-dark mb-4">{text}</h3>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {options.map((option: string, idx: number) => (
            <button
              key={idx}
              onClick={() => onAnswer(id, option, type === "multi")}
              className={`px-4 py-2 rounded-full border text-sm transition-all duration-300 ${
                isSelected(id, option)
                  ? "bg-rose/10 border-rose text-dark"
                  : "border-gold/50 text-mauve hover:border-rose"
              }`}
              style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}
            >
              {option}
            </button>
          ))}
          {customAnswers.map((custom: string, idx: number) => (
            <button
              key={`custom-${idx}`}
              onClick={() => onAnswer(id, custom, type === "multi")}
              className="px-4 py-2 rounded-full border bg-gold/10 border-gold text-dark text-sm transition-all duration-300 hover:bg-gold/20"
              style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}
            >
              {custom} ✕
            </button>
          ))}
        </div>
        {showCustomInput && (
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={customIngredient}
              onChange={(e) => setCustomIngredient(e.target.value)}
              placeholder="+ Add another ingredient…"
              className="flex-1 bg-cream border border-gold/30 rounded-full px-4 py-2 text-sm text-mauve placeholder:text-mauve/40 outline-none focus:border-rose transition-colors duration-300"
              style={{ fontFamily: "Jost, sans-serif", fontWeight: