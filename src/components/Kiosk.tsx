import React, { useRef, useState, useEffect } from 'react';
import { Camera, Send, Loader2, AlertTriangle, ShieldCheck, BrainCircuit } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { io } from 'socket.io-client';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const socket = io();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Message {
  id: string;
  role: 'bot' | 'user';
  text: string;
}

export default function Kiosk() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'bot', text: "Hello! I'm MindGuard. How are you feeling today?" }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<'calm' | 'detecting' | 'alert'>('calm');
  const [currentEmotion, setCurrentEmotion] = useState('Neutral');
  const [riskIndex, setRiskIndex] = useState(2.4);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    }
    startCamera();
    return () => stream?.getTracks().forEach(track => track.stop());
  }, []);

  // Periodic visual analysis
  useEffect(() => {
    const interval = setInterval(() => {
      analyzeVisualState();
    }, 5000); // Analyze every 5 seconds for higher responsiveness
    return () => clearInterval(interval);
  }, [stream]);

  const analyzeVisualState = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
    
    setIsAnalyzing(true);
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.5);
    const base64Data = imageData.split(',')[1];

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: "CRITICAL: Carefully analyze this student's facial expression and micro-expressions. Detect signs of sadness, stress, anxiety, or fatigue even if subtle. Be direct. Provide a JSON object with: { 'emotion': 'One word: Sad/Stress/Anxious/Neutral/Happy', 'stressLevel': 0-100, 'behavior': 'normal'|'restless'|'withdrawn', 'notes': 'detailed observations' }" },
              { inlineData: { mimeType: "image/jpeg", data: base64Data } }
            ]
          }
        ],
        config: { responseMimeType: "application/json" }
      });

      const textOutput = response.text || '{}';
      const analysis = JSON.parse(textOutput);
      console.log('Visual Analysis:', analysis);

      setCurrentEmotion(analysis.emotion || 'Neutral');
      setRiskIndex(prev => {
        const newScore = analysis.stressLevel / 10;
        return Number(newScore.toFixed(1));
      });

      if (analysis.stressLevel > 40) { // Lowered threshold for medium alerts
        reportRisk(analysis.stressLevel, analysis.emotion, "Visual detection: " + analysis.notes);
        setCurrentStatus(analysis.stressLevel > 70 ? 'alert' : 'detecting');
      } else {
        setCurrentStatus('calm');
      }
    } catch (err) {
      console.error("Visual analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsAnalyzing(true);

    try {
      // Analyze sentiment and reply
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [{ 
              text: `You are a supportive school mental health assistant. 
              The student said: "${inputValue}". 
              Analyze the sentiment and respond with a JSON object: 
              { "reply": "a warm empathetic reply", "sentimentScore": 0-100 (0 is very negative/distressed, 100 is very positive), "concerns": "notes on mental state if any" }` 
            }]
          }
        ],
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || '{}');
      
      setMessages(prev => [...prev, { id: 'bot-' + Date.now(), role: 'bot', text: result.reply }]);

      // If sentiment is very low, report it
      if (result.sentimentScore < 40) {
        reportRisk(100 - result.sentimentScore, "Analyzed from text", result.concerns);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reportRisk = async (score: number, emotion: string, notes: string) => {
    try {
      await fetch('/api/report-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: '1', // Hardcoded for demo/prototype
          riskScore: score,
          emotion: emotion,
          textSentiment: "Analyzed via NLP",
          behavioralNotes: notes
        })
      });
    } catch (err) {
      console.error("Failed to report risk:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 relative overflow-hidden flex flex-col md:flex-row gap-6">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500 rounded-full blur-[120px]" />
      </div>

      {/* Camera Feed Section */}
      <div className="flex-1 flex flex-col gap-4 z-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 text-xs font-mono">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            SYSTEM_ACTIVE: AI_KIOSK_MODE
          </div>
          {isAnalyzing && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-400 text-xs font-mono">
              <Loader2 className="w-3 h-3 animate-spin" />
              ANALYZING_FACIAL_METRICS
            </div>
          )}
        </div>

        <div className="relative aspect-video bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl group">
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className="w-full h-full object-cover grayscale-[30%] contrast-[110%]"
          />
          <canvas ref={canvasRef} width="640" height="480" className="hidden" />
          
          {/* Scanning Overlay */}
          <div className="absolute inset-0 pointer-events-none border-[40px] border-slate-950/20">
             <div className="absolute top-10 left-10 w-8 h-8 border-t-2 border-l-2 border-blue-500" />
             <div className="absolute top-10 right-10 w-8 h-8 border-t-2 border-r-2 border-blue-500" />
             <div className="absolute bottom-10 left-10 w-8 h-8 border-b-2 border-l-2 border-blue-500" />
             <div className="absolute bottom-10 right-10 w-8 h-8 border-b-2 border-r-2 border-blue-500" />
          </div>
          
          <AnimatePresence>
            {currentStatus === 'alert' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-red-600/20 flex items-center justify-center border-4 border-red-500"
              >
                <div className="bg-red-600 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 animate-bounce">
                  <AlertTriangle className="w-5 h-5" />
                  HIGH_STRESS_DETECTED
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Biometric Data Visualizer Placeholder */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
            <div className="space-y-1">
              <div className="text-[10px] text-slate-400 font-mono">HEART_RATE_EST: 72 BPM</div>
              <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  animate={{ width: isAnalyzing ? '70%' : '30%' }} 
                  className="h-full bg-blue-500" 
                />
              </div>
            </div>
            <div className="flex gap-1">
              {[...Array(8)].map((_, i) => (
                <motion.div 
                  key={i}
                  animate={{ height: [10, Math.random() * 30 + 10, 10] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                  className="w-1 bg-blue-500/50 rounded-full"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
            <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
              <BrainCircuit className="w-3 h-3" /> EMOTION
            </div>
            <div className={cn(
              "text-lg font-semibold uppercase tracking-wider",
              currentEmotion === 'Neutral' ? "text-blue-400" : "text-amber-400"
            )}>
              {isAnalyzing ? '...' : currentEmotion}
            </div>
          </div>
          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
            <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> PRIVACY
            </div>
            <div className="text-lg font-semibold text-emerald-400">ENCRYPTED</div>
          </div>
          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
            <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> RISK_INDEX
            </div>
            <div className={cn(
              "text-lg font-semibold",
              riskIndex > 5 ? "text-red-400" : "text-slate-200"
            )}>
              {riskIndex}%
            </div>
          </div>
        </div>
      </div>

      {/* Chat Section */}
      <div className="w-full md:w-[400px] flex flex-col bg-slate-900/50 border border-slate-800 rounded-2xl z-10 backdrop-blur-md">
        <div className="p-4 border-bottom border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <div className="font-semibold text-sm">MindGuard AI</div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Online & Monitoring
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-sm scrollbar-hide">
          {messages.map(msg => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id}
              className={cn(
                "max-w-[85%] p-3 rounded-2xl",
                msg.role === 'bot' 
                  ? "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700" 
                  : "bg-blue-600 text-white ml-auto rounded-tr-none shadow-lg shadow-blue-500/20"
              )}
            >
              {msg.text}
            </motion.div>
          ))}
          {isAnalyzing && (
            <div className="flex gap-2">
               <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
               <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
               <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
            <input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500"
            />
            <button 
              type="submit"
              className="w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center justify-center active:scale-95 transition-all"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </form>
          <div className="mt-2 text-[10px] text-slate-500 text-center uppercase tracking-widest font-mono">
            Conversational_NLP_active_v2.4
          </div>
        </div>
      </div>
    </div>
  );
}
