/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Calculator,
  Check,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Plus,
} from 'lucide-react';
import { FoodItem } from '../types';
import {
  convertServingTo100g,
  verifyAtwater,
  scalePhotoNutritionByGrams,
  parseNutritionTextToCoreMacros,
  getLocalTodayStr,
} from '../utils/nutrition';

interface NutritionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveFood: (foodData: Omit<FoodItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialMode?: 'serving' | 'paste';
}

export const NutritionImportModal: React.FC<NutritionImportModalProps> = ({
  isOpen,
  onClose,
  onSaveFood,
  initialMode = 'serving',
}) => {
  const [activeMode, setActiveMode] = useState<'serving' | 'paste'>(initialMode);

  // Common state for Serving / Paste modes
  const [foodName, setFoodName] = useState('');
  const [aliases, setAliases] = useState<string[]>([]);
  const [aliasInput, setAliasInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Mode A: Serving Converter State
  const [servingGrams, setServingGrams] = useState<number | ''>(100);
  const [servingCalories, setServingCalories] = useState<number | ''>('');
  const [servingProtein, setServingProtein] = useState<number | ''>('');
  const [servingFat, setServingFat] = useState<number | ''>('');
  const [servingCarbs, setServingCarbs] = useState<number | ''>('');

  // Mode B: Paste Text State
  const [pastedText, setPastedText] = useState('');

  // Final Per-100g Values for Serving & Paste modes
  const [finalCaloriesPer100g, setFinalCaloriesPer100g] = useState<number>(0);
  const [finalProteinPer100g, setFinalProteinPer100g] = useState<number | null>(null);
  const [finalFatPer100g, setFinalFatPer100g] = useState<number | null>(null);
  const [finalCarbsPer100g, setFinalCarbsPer100g] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveMode(initialMode);
      setImportError(null);
    }
  }, [isOpen, initialMode]);

  // Real-time calculation for Serving Converter
  const calculateFromServing = () => {
    const sGrams = typeof servingGrams === 'number' && servingGrams > 0 ? servingGrams : 100;
    const sCal = typeof servingCalories === 'number' ? servingCalories : 0;
    const sProt = typeof servingProtein === 'number' ? servingProtein : null;
    const sFat = typeof servingFat === 'number' ? servingFat : null;
    const sCarbs = typeof servingCarbs === 'number' ? servingCarbs : null;

    const res = convertServingTo100g(sGrams, sCal, sProt, sFat, sCarbs);
    setFinalCaloriesPer100g(res.calories);
    setFinalProteinPer100g(res.protein);
    setFinalFatPer100g(res.fat);
    setFinalCarbsPer100g(res.carbs);
  };

  useEffect(() => {
    if (isOpen && activeMode === 'serving') {
      calculateFromServing();
    }
  }, [isOpen, activeMode, servingGrams, servingCalories, servingProtein, servingFat, servingCarbs]);

  if (!isOpen) return null;

  // Parse Pasted Text
  const handleParsePastedText = () => {
    if (!pastedText.trim()) return;
    setImportError(null);

    const parsed = parseNutritionTextToCoreMacros(pastedText);
    if (!parsed) {
      setImportError(
        'Teks nutrisi belum terbaca. Pastikan terdapat angka Kalori, Protein, Karbohidrat, atau Lemak.'
      );
      return;
    }

    setServingGrams(parsed.portionGrams);
    setServingCalories(parsed.calories);
    setServingProtein(parsed.protein);
    setServingCarbs(parsed.carbs);
    setServingFat(parsed.fat);

    const scaled = scalePhotoNutritionByGrams(parsed, 100);
    setFinalCaloriesPer100g(scaled.per100g.calories);
    setFinalProteinPer100g(scaled.per100g.protein);
    setFinalCarbsPer100g(scaled.per100g.carbs);
    setFinalFatPer100g(scaled.per100g.fat);

    const lines = pastedText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length > 0 && lines[0].length < 35 && !foodName) {
      setFoodName(lines[0]);
    }
  };

  const handleAddAlias = () => {
    const clean = aliasInput.trim();
    if (clean && !aliases.includes(clean)) {
      setAliases([...aliases, clean]);
      setAliasInput('');
    }
  };

  const atwater = verifyAtwater(
    finalCaloriesPer100g,
    finalProteinPer100g,
    finalFatPer100g,
    finalCarbsPer100g
  );

  const handleSaveServingOrPasteToDatabase = () => {
    setImportError(null);
    if (!foodName.trim()) {
      setImportError('Mohon masukkan nama makanan.');
      return;
    }
    if (finalCaloriesPer100g <= 0) {
      setImportError('Kalori per 100g harus lebih besar dari 0.');
      return;
    }

    onSaveFood({
      name: foodName.trim(),
      aliases: aliases,
      calories: finalCaloriesPer100g,
      protein: finalProteinPer100g,
      fat: finalFatPer100g,
      carbs: finalCarbsPer100g,
      source: 'Konversi Takaran Saji',
      notes: `Takaran saji awal: ${servingGrams || 100}g`,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#0f172a] border-t sm:border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] flex flex-col shadow-2xl safe-bottom">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Input Nutrisi</h3>
              <p className="text-xs text-slate-400">
                Hitung Kalori, Protein, Carb & Fat per 100g
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* 2 Modes Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 my-3 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            data-testid="import-tab-serving"
            onClick={() => {
              setActiveMode('serving');
              setImportError(null);
              calculateFromServing();
            }}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeMode === 'serving'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Takaran Saji
          </button>
          <button
            type="button"
            data-testid="import-tab-paste"
            onClick={() => {
              setActiveMode('paste');
              setImportError(null);
            }}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeMode === 'paste'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Paste Teks
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-1">
          {importError && (
            <div
              data-testid="import-error"
              className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-between"
            >
              <span>{importError}</span>
              <button
                type="button"
                onClick={() => setImportError(null)}
                className="text-slate-400 hover:text-white ml-2"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* MODE A & B: Serving Converter & Paste Text */}
          {(
            <>
              {/* Food Name & Aliases */}
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div>
                  <label className="text-xs font-bold text-slate-300">
                    Nama Makanan <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    placeholder="Contoh: Susu Kedelai Kotak, Roti Gandum"
                    className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex space-x-1.5 pt-1">
                  <input
                    type="text"
                    value={aliasInput}
                    onChange={(e) => setAliasInput(e.target.value)}
                    placeholder="Tambah alias (opsional)..."
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddAlias}
                    className="px-2.5 py-1.5 bg-slate-800 text-sky-400 rounded-xl text-xs font-bold hover:bg-slate-700"
                  >
                    +
                  </button>
                </div>

                {aliases.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {aliases.map((a, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-300 rounded border border-slate-700"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {activeMode === 'serving' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        Nilai Sesuai Kemasan Produk
                      </span>
                      <span className="text-[11px] text-sky-400">1 sajian</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-400">
                          Takaran Saji (gram/ml)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={servingGrams}
                          onChange={(e) => {
                            setServingGrams(parseFloat(e.target.value) || '');
                          }}
                          onBlur={calculateFromServing}
                          className="w-full mt-0.5 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400">Kalori Per Sajian</label>
                        <input
                          type="number"
                          min="0"
                          value={servingCalories}
                          placeholder="0"
                          onChange={(e) => {
                            setServingCalories(parseFloat(e.target.value) || '');
                          }}
                          onBlur={calculateFromServing}
                          className="w-full mt-0.5 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-emerald-400 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <div>
                        <label className="text-[10px] text-slate-400">Protein (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={servingProtein}
                          placeholder="0"
                          onChange={(e) => {
                            setServingProtein(
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                            );
                          }}
                          onBlur={calculateFromServing}
                          className="w-full mt-0.5 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Carb (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={servingCarbs}
                          placeholder="0"
                          onChange={(e) => {
                            setServingCarbs(
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                            );
                          }}
                          onBlur={calculateFromServing}
                          className="w-full mt-0.5 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Fat (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={servingFat}
                          placeholder="0"
                          onChange={(e) => {
                            setServingFat(
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                            );
                          }}
                          onBlur={calculateFromServing}
                          className="w-full mt-0.5 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeMode === 'paste' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">
                    Tempel Teks Informasi Nilai Gizi
                  </label>
                  <textarea
                    rows={4}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Contoh:&#10;Energi total: 140 kkal&#10;Takaran saji: 40g&#10;Protein: 10g&#10;Karbohidrat: 18g&#10;Lemak total: 4.5g"
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-2xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleParsePastedText}
                    disabled={!pastedText.trim()}
                    className="w-full py-2 rounded-xl bg-sky-500 text-slate-950 text-xs font-bold hover:bg-sky-400 active:scale-95 disabled:opacity-40"
                  >
                    Ekstrak Kalori, Protein, Carb & Fat
                  </button>
                </div>
              )}

              {/* FINAL RESULT PREVIEW PER 100g (For Serving & Paste modes) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wide">
                    Hasil Konversi Basis 100 Gram
                  </span>
                  <span className="text-[10px] text-slate-400">4 Makro Utama</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Calories</span>
                    <input
                      type="number"
                      value={finalCaloriesPer100g || ''}
                      placeholder="0"
                      onChange={(e) => setFinalCaloriesPer100g(parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent text-sm font-black text-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Protein</span>
                    <input
                      type="number"
                      step="0.1"
                      value={finalProteinPer100g ?? ''}
                      placeholder="0"
                      onChange={(e) =>
                        setFinalProteinPer100g(
                          e.target.value === '' ? null : parseFloat(e.target.value)
                        )
                      }
                      className="w-full bg-transparent text-xs font-bold text-white focus:outline-none"
                    />
                  </div>

                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Carb</span>
                    <input
                      type="number"
                      step="0.1"
                      value={finalCarbsPer100g ?? ''}
                      placeholder="0"
                      onChange={(e) =>
                        setFinalCarbsPer100g(
                          e.target.value === '' ? null : parseFloat(e.target.value)
                        )
                      }
                      className="w-full bg-transparent text-xs font-bold text-white focus:outline-none"
                    />
                  </div>

                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Fat</span>
                    <input
                      type="number"
                      step="0.1"
                      value={finalFatPer100g ?? ''}
                      placeholder="0"
                      onChange={(e) =>
                        setFinalFatPer100g(
                          e.target.value === '' ? null : parseFloat(e.target.value)
                        )
                      }
                      className="w-full bg-transparent text-xs font-bold text-white focus:outline-none"
                    />
                  </div>
                </div>

                {finalCaloriesPer100g > 0 && !atwater.isConsistent && (
                  <p className="text-[10px] text-amber-400 flex items-center space-x-1">
                    <AlertCircle size={11} />
                    <span>{atwater.message}</span>
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex space-x-2">
          {(
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!foodName.trim() || finalCaloriesPer100g <= 0}
                onClick={handleSaveServingOrPasteToDatabase}
                className="flex-1 py-3 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black hover:bg-emerald-400 active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center space-x-1"
              >
                <Check size={16} strokeWidth={3} />
                <span>Simpan ke Database</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
