import React from "react";
import { MessageSquare, Briefcase } from "lucide-react";

const SAMPLES = {
  es: [
    { icon: MessageSquare, label: "Greeting", text: "Hola, mucho gusto en conocerte." },
    { icon: Briefcase, label: "Business", text: "Gracias por llamar. Estoy interesado en colaborar con su empresa." },
  ],
  zh: [
    { icon: MessageSquare, label: "Greeting", text: "你好，很高兴认识你。" },
    { icon: Briefcase, label: "Business", text: "感谢您的来电。我对与贵公司合作很感兴趣。" },
  ],
  de: [
    { icon: MessageSquare, label: "Greeting", text: "Hallo, freut mich, Sie kennenzulernen." },
    { icon: Briefcase, label: "Business", text: "Danke für Ihren Anruf. Ich bin an einer Zusammenarbeit interessiert." },
  ],
  fr: [
    { icon: MessageSquare, label: "Greeting", text: "Bonjour, enchanté de vous rencontrer." },
    { icon: Briefcase, label: "Business", text: "Merci d'avoir appelé. Je suis intéressé par une collaboration." },
  ],
  sw: [
    { icon: MessageSquare, label: "Greeting", text: "Habari, ninafuraha kukutana nawe." },
    { icon: Briefcase, label: "Business", text: "Asante kwa kupiga. Niko interested kushirikiana na kampuni yako." },
  ],
};

export function TextSelector({ onSelect, language }) {
  const samples = SAMPLES[language] || SAMPLES.es;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-center">What should you say?</h2>
      <p className="text-center text-gray-400 mb-6">Select a phrase to translate</p>
      
      <div className="grid gap-4">
        {samples.map((sample) => (
          <button
            key={sample.label}
            onClick={() => onSelect(sample.text)}
            className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <sample.icon className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium">{sample.label}</div>
              <div className="text-sm text-gray-400">{sample.text}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
