
import React, { useState, useMemo } from 'react';
import { 
  PieChart as LucidePieChart, 
  Map as LucideMap, 
  Users, 
  Search, 
  Lightbulb, 
  ShieldCheck, 
  Upload, 
  AlertCircle, 
  Loader2, 
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  X, 
  Sparkles, 
  Zap, 
  LayoutGrid, 
  Paperclip, 
  ArrowDownWideNarrow, 
  ListOrdered, 
  RefreshCcw, 
  Target, 
  MessageSquareQuote, 
  Quote, 
  CheckCircle2, 
  Database, 
  Link as LinkIcon, 
  UserCircle, 
  ChevronDown, 
  ChevronUp, 
  Target as TargetIcon, 
  Info,
  MapPin,
  ArrowRightCircle,
  Smile,
  Frown,
  Meh,
  Activity,
  TrendingUp,
  LineChart,
  ArrowRight,
  ClipboardCheck,
  LayoutTemplate
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer, 
  Cell, 
  LabelList,
  Tooltip
} from 'recharts';
import * as XLSX from 'xlsx';
import { AnalysisType, PersonaData, JourneyStage, AnalysisResult, ComprehensiveReport } from './types';
import { 
  analyzeData, 
  generatePersonaClusters, 
  generatePersonaImage, 
  generateJourneyMap, 
  analyzeCompetitor, 
  analyzeOpportunities, 
  analyzeComprehensive,
  MediaPart 
} from './services/geminiService';

interface AttachedFile {
  id: string;
  name: string;
  type: string;
  base64: string;
}

type ChartSortMode = 'original' | 'descending';

const EmotionIcon = ({ score, size = 18 }: { score: number, size?: number }) => {
  if (score >= 4) return <Smile size={size} className="text-amber-500 fill-amber-100" />;
  if (score <= 2) return <Frown size={size} className="text-rose-500 fill-rose-100" />;
  return <Meh size={size} className="text-slate-400 fill-slate-100" />;
};

const App: React.FC = () => {
  const [isLanding, setIsLanding] = useState(true);
  const [activeTab, setActiveTab] = useState<AnalysisType>(AnalysisType.DATA_ANALYSIS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null); 
  const [excelData, setExcelData] = useState<string | null>(null);
  const [excelFileName, setExcelFileName] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]); 
  
  const [dataResult, setDataResult] = useState<AnalysisResult | null>(null);
  const [personaResults, setPersonaResults] = useState<PersonaData[] | null>(null);
  const [journeyResult, setJourneyResult] = useState<JourneyStage[] | null>(null);
  const [competitorResult, setCompetitorResult] = useState<any | null>(null);
  const [opportunityResult, setOpportunityResult] = useState<any[] | null>(null);
  const [comprehensiveResult, setComprehensiveResult] = useState<ComprehensiveReport | null>(null);

  const [selectedPersonaForJourney, setSelectedPersonaForJourney] = useState<PersonaData | null>(null);
  const [journeyTheme, setJourneyTheme] = useState('购买保险用户旅程');

  const [chartSortModes, setChartSortModes] = useState<Record<number, ChartSortMode>>({});
  const [expandedPersonas, setExpandedPersonas] = useState<Record<number, boolean>>({});

  const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

  const hasSourceData = !!excelData || attachedFiles.length > 0 || !!uploadedImage;

  const handleMultimodalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target?.result as string;
        
        if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
          setExcelFileName(file.name);
          const wb = XLSX.read(base64.split(',')[1], { type: 'base64' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
          const formattedCsv = data
            .map((row: any) => row.map((cell: any) => String(cell).replace(/,/g, "，")).join(","))
            .join("\n");
          setExcelData(formattedCsv);
        } else {
          setAttachedFiles(prev => [
            ...prev,
            {
              id: Math.random().toString(36).substr(2, 9),
              name: file.name,
              type: file.type,
              base64: base64.split(',')[1]
            }
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachedFile = (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleCompetitorImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearExcel = () => {
    setExcelData(null);
    setExcelFileName(null);
  };

  const toggleSortMode = (index: number) => {
    setChartSortModes(prev => ({ ...prev, [index]: prev[index] === 'descending' ? 'original' : 'descending' }));
  };

  const togglePersonaExpand = (index: number) => {
    setExpandedPersonas(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const startJourneyMapping = (persona: PersonaData) => {
    setSelectedPersonaForJourney(persona);
    setActiveTab(AnalysisType.JOURNEY_MAP);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerateJourney = async () => {
    if (!selectedPersonaForJourney || !journeyTheme) return;
    setLoading(true);
    setError(null);
    try {
      const jr = await generateJourneyMap(selectedPersonaForJourney, journeyTheme, excelData || inputText);
      setJourneyResult(jr);
    } catch (err: any) {
      setError(err?.message || '生成体验地图失败');
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    const sourceText = excelData || '';
    const userInstructions = inputText.trim();

    if (!sourceText && !userInstructions && attachedFiles.length === 0 && !uploadedImage) return;

    setLoading(true);
    setError(null);
    setChartSortModes({});
    setExpandedPersonas({});
    try {
      const mediaParts: MediaPart[] = attachedFiles.map(f => ({
        inlineData: { data: f.base64, mimeType: f.type }
      }));

      switch (activeTab) {
        case AnalysisType.DATA_ANALYSIS:
          const dr = await analyzeData(sourceText, userInstructions, mediaParts);
          setDataResult(dr);
          break;
        case AnalysisType.PERSONA:
          const clusters = await generatePersonaClusters(sourceText, userInstructions, mediaParts);
          const personasWithImages = await Promise.all(clusters.map(async (p: PersonaData) => {
            const imageUrl = await generatePersonaImage(p.imagePrompt || p.bio);
            return { ...p, imageUrl };
          }));
          setPersonaResults(personasWithImages);
          break;
        case AnalysisType.JOURNEY_MAP:
          await handleGenerateJourney();
          break;
        case AnalysisType.COMPETITOR:
          const cr = await analyzeCompetitor(sourceText || userInstructions, userInstructions, uploadedImage || undefined);
          setCompetitorResult(cr);
          break;
        case AnalysisType.OPPORTUNITIES:
          const or = await analyzeOpportunities(sourceText || userInstructions, userInstructions);
          setOpportunityResult(or);
          break;
        case AnalysisType.COMPREHENSIVE:
          const compResult = await analyzeComprehensive(sourceText, userInstructions, mediaParts);
          // 为画像补充 AI 绘图
          const personasWithImagesComp = await Promise.all((compResult.personas || []).map(async (p: PersonaData) => {
            const imageUrl = await generatePersonaImage(p.imagePrompt || p.bio);
            return { ...p, imageUrl };
          }));
          setComprehensiveResult({ ...compResult, personas: personasWithImagesComp });
          break;
      }
    } catch (err: any) {
      setError(err?.message || '分析任务执行异常');
    } finally {
      setLoading(false);
    }
  };

  const colWidth = 300; 

  const emotionCurvePath = (data: JourneyStage[] | null) => {
    if (!data) return "";
    const height = 150; 
    const points = data.map((s, i) => {
      const x = colWidth * i + colWidth / 2;
      const y = height - ((s.emotions - 1) / 4) * 100 - 25;
      return { x, y };
    });

    if (points.length < 2) return "";

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cp1x = curr.x + (next.x - curr.x) / 2;
      const cp2x = curr.x + (next.x - curr.x) / 2;
      path += ` C ${cp1x} ${curr.y} ${cp2x} ${next.y} ${next.x} ${next.y}`;
    }
    return path;
  };

  const handleStartFeature = (type: AnalysisType) => {
    setActiveTab(type);
    setIsLanding(false);
    setTimeout(() => {
      document.getElementById('multimodalUpload')?.click();
    }, 300);
  };

  const renderLandingPage = () => (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-8 bg-slate-50 animate-in fade-in zoom-in-95 duration-1000">
      <div className="max-w-6xl w-full space-y-16">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-3 px-6 py-2 bg-indigo-600 rounded-full text-white shadow-xl shadow-indigo-200 mb-4 animate-bounce">
            <ShieldCheck size={20} />
            <span className="text-xs font-black uppercase tracking-widest">InsureInsight AI v2.5</span>
          </div>
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-none">
            保险需求分析 <span className="text-indigo-600">专家系统</span>
          </h1>
          <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto leading-relaxed">
            利用 Gemini 3.0 全模态认知引擎，深度解析保险调研数据，自动化构建画像与体验地图，发现设计机会点。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <LandingCard 
            icon={<LayoutTemplate size={40} />} 
            title="综合全链路分析" 
            desc="一次性完成问卷统计、画像聚类、旅程推演及机会挖掘，输出行业级完整报告。"
            color="bg-slate-900"
            onClick={() => handleStartFeature(AnalysisType.COMPREHENSIVE)}
            isNew
          />
          <LandingCard 
            icon={<LucidePieChart size={40} />} 
            title="调研数据分析" 
            desc="全量题目识别统计、多变量关联回归分析，自动生成可视化图表。"
            color="bg-blue-600"
            onClick={() => handleStartFeature(AnalysisType.DATA_ANALYSIS)}
          />
          <LandingCard 
            icon={<Users size={40} />} 
            title="用户画像绘制" 
            desc="多模态聚类分析，自动生成人物传记、视觉形象及真实证据链。"
            color="bg-indigo-600"
            onClick={() => handleStartFeature(AnalysisType.PERSONA)}
          />
          <LandingCard 
            icon={<LucideMap size={40} />} 
            title="体验地图绘制" 
            desc="全周期旅程映射，包含行为、情绪曲线、痛点及针对性机会点。"
            color="bg-teal-600"
            onClick={() => handleStartFeature(AnalysisType.JOURNEY_MAP)}
          />
          <LandingCard 
            icon={<Search size={40} />} 
            title="竞品深度分析" 
            desc="支持截图上传，自动拆解视觉风格、功能链路并给出优劣势总结。"
            color="bg-rose-600"
            onClick={() => handleStartFeature(AnalysisType.COMPETITOR)}
          />
          <LandingCard 
            icon={<Lightbulb size={40} />} 
            title="设计机会洞察" 
            desc="基于全局数据挖掘高商业价值的设计洞察，评估可行性与影响力。"
            color="bg-emerald-600"
            onClick={() => handleStartFeature(AnalysisType.OPPORTUNITIES)}
          />
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[600px] text-center space-y-6 animate-in fade-in duration-500">
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mb-4">
            <AlertCircle className="w-10 h-10" />
          </div>
          <div className="max-w-md space-y-2">
            <h3 className="text-xl font-black text-slate-900">任务中断</h3>
            <p className="text-slate-500 font-medium text-sm">{error}</p>
          </div>
          <button onClick={runAnalysis} className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all">
            <RefreshCcw className="w-4 h-4" /> 重新执行
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case AnalysisType.COMPREHENSIVE:
        return (
          <div className="space-y-24 pb-24 animate-in fade-in duration-1000">
            {comprehensiveResult && (
              <>
                {/* 报告头 */}
                <div className="bg-slate-900 p-16 rounded-[64px] text-white shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12"><ClipboardCheck size={200} /></div>
                   <div className="relative z-10 space-y-8">
                     <h3 className="text-4xl font-black flex items-center gap-6"><Sparkles className="text-blue-400 w-12 h-12" /> 综合全链路分析报告</h3>
                     <p className="text-2xl text-slate-300 font-medium leading-relaxed max-w-4xl whitespace-pre-wrap">{comprehensiveResult.summary}</p>
                   </div>
                </div>

                {/* 1. 数据统计 */}
                <section className="space-y-12">
                   <SectionTitle icon={<LucidePieChart />} title="Section 01: 调研数据洞察" />
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {comprehensiveResult.dataAnalysis.charts.slice(0, 4).map((chart, idx) => (
                        <div key={idx} className="bg-white p-8 rounded-[48px] shadow-sm border border-slate-100 h-[380px]">
                           <h4 className="text-sm font-black text-slate-800 mb-6 truncate">{chart.title}</h4>
                           <ResponsiveContainer width="100%" height="80%">
                             <BarChart data={chart.data} layout="vertical">
                               <XAxis type="number" hide />
                               <YAxis type="category" dataKey="label" width={100} tick={{fontSize: 10, fontWeight: 700}} />
                               <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                                  {chart.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                               </Bar>
                             </BarChart>
                           </ResponsiveContainer>
                        </div>
                      ))}
                   </div>
                </section>

                {/* 2. 画像聚类 */}
                <section className="space-y-12">
                   <SectionTitle icon={<Users />} title="Section 02: 典型画像聚类" />
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      {comprehensiveResult.personas.map((persona, idx) => (
                        <div key={idx} className="bg-white p-10 rounded-[56px] border border-slate-100 shadow-xl flex gap-8">
                           <div className="w-40 h-52 bg-slate-50 rounded-[32px] overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
                             {persona.imageUrl ? <img src={persona.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><UserCircle size={60} /></div>}
                           </div>
                           <div className="space-y-4">
                             <h4 className="text-2xl font-black text-slate-900">{persona.name}</h4>
                             <p className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg w-fit">{persona.role}</p>
                             <p className="text-slate-500 text-sm font-medium line-clamp-3 leading-relaxed">{persona.bio}</p>
                             <div className="flex flex-wrap gap-2">
                               {persona.tags.slice(0, 3).map(tag => <span key={tag} className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{tag}</span>)}
                             </div>
                           </div>
                        </div>
                      ))}
                   </div>
                </section>

                {/* 3. 体验地图 */}
                <section className="space-y-12">
                   <SectionTitle icon={<LucideMap />} title="Section 03: 全周期体验推演" />
                   <div className="bg-white rounded-[56px] shadow-2xl overflow-hidden border border-slate-100">
                     <div className="flex overflow-x-auto custom-scrollbar">
                        <div className="flex relative min-w-full">
                           {comprehensiveResult.journey.map((stage, idx) => (
                             <div key={idx} className="w-[300px] flex-shrink-0 border-r border-slate-50 p-8 space-y-6">
                                <div className="h-12 bg-teal-50 rounded-2xl flex items-center justify-center border-2 border-teal-100">
                                   <span className="font-black text-sm text-teal-800">{stage.phase}</span>
                                </div>
                                <div className="space-y-4">
                                   <div className="space-y-2">
                                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">用户行为</p>
                                      <ul className="space-y-1">{stage.actions.map((a, i) => <li key={i} className="text-xs font-bold text-slate-600 flex gap-2"><span>·</span>{a}</li>)}</ul>
                                   </div>
                                   <div className="space-y-2">
                                      <p className="text-[10px] font-black text-rose-300 uppercase tracking-widest">痛点问题</p>
                                      <ul className="space-y-1">{stage.painPoints.map((p, i) => <li key={i} className="text-xs font-bold text-rose-700 flex gap-2"><span>×</span>{p}</li>)}</ul>
                                   </div>
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>
                   </div>
                </section>

                {/* 4. 机会挖掘 */}
                <section className="space-y-12">
                   <SectionTitle icon={<Lightbulb />} title="Section 04: 战略机会洞察" />
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     {comprehensiveResult.opportunities.map((opp, idx) => (
                       <div key={idx} className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all">
                          <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest mb-6 block w-fit">{opp.category}</span>
                          <p className="text-xl font-black text-slate-900 mb-8 leading-snug">{opp.description}</p>
                          <div className="flex flex-col gap-2 pt-6 border-t border-slate-50">
                             <div className="flex justify-between text-[10px] font-black"><span className="text-slate-400">商业影响力</span><span className="text-slate-900 uppercase">{opp.impact}</span></div>
                             <div className="flex justify-between text-[10px] font-black"><span className="text-slate-400">落地可行性</span><span className="text-slate-900 uppercase">{opp.feasibility}</span></div>
                          </div>
                       </div>
                     ))}
                   </div>
                </section>

                <div className="flex justify-center pt-24">
                   <button className="flex items-center gap-4 px-12 py-6 bg-slate-900 text-white rounded-[32px] font-black text-lg shadow-2xl hover:bg-indigo-600 transition-all">
                      <Upload size={24} /> 导出 PDF 完整报告
                   </button>
                </div>
              </>
            )}
          </div>
        );
      case AnalysisType.DATA_ANALYSIS:
        return (
          <div className="space-y-12 animate-in fade-in duration-500 pb-12">
            {dataResult && (
              <>
                <div className="bg-slate-900 p-12 rounded-[56px] text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                    <ShieldCheck size={120} />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-2xl font-black mb-8 flex items-center gap-4">
                      <Sparkles className="text-blue-400 w-8 h-8" /> 
                      调研全量审计报告
                    </h3>
                    <p className="text-slate-300 whitespace-pre-wrap leading-loose text-lg font-medium max-w-4xl">
                      {dataResult.summary}
                    </p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                        <LucidePieChart size={20} />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">所有调研题目频数分布 ({dataResult.charts.length})</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {dataResult.charts.map((chart, index) => {
                      const mode = chartSortModes[index] || 'original';
                      const displayData = mode === 'descending' ? [...chart.data].sort((a, b) => b.value - a.value) : chart.data;
                      return (
                        <div key={index} className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 h-[420px] flex flex-col hover:border-blue-200 transition-all group">
                          <div className="flex justify-between items-start mb-6 gap-4">
                            <div>
                              <h4 className="text-sm font-black text-slate-800 leading-snug line-clamp-2">
                                {chart.title}
                              </h4>
                              <p className="text-[10px] text-blue-600 font-black mt-1.5 uppercase tracking-widest">
                                Valid Sample: N={chart.totalResponses}
                              </p>
                            </div>
                            <button onClick={() => toggleSortMode(index)} className={`p-2.5 rounded-xl border transition-all ${mode === 'descending' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}>
                              {mode === 'descending' ? <ArrowDownWideNarrow size={18} /> : <ListOrdered size={18} />}
                            </button>
                          </div>
                          <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={displayData} layout="vertical" margin={{ left: 10, right: 60, top: 0, bottom: 0 }}>
                                <Tooltip cursor={{fill: 'rgba(241, 245, 249, 0.5)'}} />
                                <XAxis type="number" hide />
                                <YAxis 
                                  type="category" 
                                  dataKey="label" 
                                  width={120} 
                                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} 
                                  stroke="#f1f5f9"
                                />
                                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
                                  <LabelList dataKey="value" position="right" style={{ fill: '#0f172a', fontSize: '11px', fontWeight: '900' }} offset={12}/>
                                  {displayData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />)}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-8 mt-16">
                  <div className="flex items-center gap-4 px-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                      <TrendingUp size={20} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">核心关联与趋势分析</h3>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {dataResult.correlations.map((corr, idx) => (
                      <div key={idx} className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm hover:shadow-xl transition-all flex flex-col md:flex-row gap-8 items-start">
                        <div className="flex flex-col items-center gap-3 flex-shrink-0 pt-2">
                          <div className="w-20 h-20 rounded-full border-4 border-indigo-50 flex flex-col items-center justify-center bg-indigo-50/20">
                            <span className="text-xl font-black text-indigo-600">{(corr.correlation * 100).toFixed(0)}%</span>
                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">Correlation</span>
                          </div>
                        </div>
                        <div className="space-y-4 flex-1">
                          <div className="flex flex-wrap gap-2 items-center text-sm font-black text-slate-900">
                            <span className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{corr.independentVar}</span>
                            <ArrowRightCircle size={16} className="text-indigo-400" />
                            <span className="bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 text-indigo-700">{corr.dependentVar}</span>
                          </div>
                          <p className="text-slate-600 font-medium leading-relaxed italic border-l-4 border-slate-100 pl-4 py-1">
                            {corr.insight}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                   <div className="bg-rose-50/40 p-10 rounded-[48px] border border-rose-100 space-y-6">
                      <h4 className="text-sm font-black text-rose-800 uppercase tracking-widest flex items-center gap-3">
                        <AlertCircle size={18} /> 核心痛点归纳
                      </h4>
                      <ul className="space-y-3">
                        {dataResult.painPoints.map((p, i) => (
                          <li key={i} className="text-slate-800 font-bold text-sm bg-white p-4 rounded-2xl shadow-sm border border-rose-50 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-rose-400" /> {p}
                          </li>
                        ))}
                      </ul>
                   </div>
                   <div className="bg-emerald-50/40 p-10 rounded-[48px] border border-emerald-100 space-y-6">
                      <h4 className="text-sm font-black text-emerald-800 uppercase tracking-widest flex items-center gap-3">
                        <Lightbulb size={18} /> 挖掘设计机会点
                      </h4>
                      <ul className="space-y-3">
                        {dataResult.opportunities.map((o, i) => (
                          <li key={i} className="text-slate-800 font-bold text-sm bg-white p-4 rounded-2xl shadow-sm border border-emerald-50 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" /> {o}
                          </li>
                        ))}
                      </ul>
                   </div>
                </div>
              </>
            )}
          </div>
        );

      case AnalysisType.PERSONA:
        return (
          <div className="space-y-12 animate-in fade-in duration-700 relative">
            {personaResults && (
              <div className="flex flex-col gap-12 max-w-6xl mx-auto">
                <div className="flex items-center gap-5 mb-4">
                  <div className="w-14 h-14 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-indigo-200">
                    <Users className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">已识别 {personaResults.length} 类核心画像</h3>
                    <p className="text-slate-500 text-sm font-semibold mt-1">深度解析保险决策偏好与真实体验证据</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-10">
                  {personaResults.map((persona, idx) => {
                    const isExpanded = expandedPersonas[idx] || false;
                    return (
                      <div key={idx} className="bg-white rounded-[56px] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden flex flex-col group">
                        <div className="p-10 lg:p-14 lg:grid lg:grid-cols-12 gap-12">
                          <div className="lg:col-span-4 flex flex-col gap-8">
                            <div className="relative aspect-[4/5] w-full rounded-[40px] overflow-hidden shadow-2xl shadow-slate-200 border-8 border-white">
                              {persona.imageUrl ? <img src={persona.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200"><UserCircle size={100} strokeWidth={1} /></div>}
                            </div>
                            <div className="space-y-4 px-2">
                              <div>
                                <h4 className="text-4xl font-black text-slate-900">{persona.name}</h4>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[11px] font-bold rounded-lg border border-indigo-100">{persona.role}</span>
                                  <span className="text-slate-400 font-bold text-base">{persona.age} 岁</span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {persona.tags.map(tag => <span key={tag} className="px-2.5 py-1 bg-slate-50 rounded-xl text-[10px] font-bold text-slate-500 border border-slate-100">{tag}</span>)}
                              </div>
                              <button 
                                onClick={() => startJourneyMapping(persona)}
                                className="w-full mt-4 flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                              >
                                <LucideMap size={16} /> 基于此画像生成体验地图
                              </button>
                            </div>
                          </div>

                          <div className="lg:col-span-8 flex flex-col gap-10">
                            <section className="space-y-3">
                              <div className="flex items-center gap-2 text-slate-400"><Info size={14} /><h5 className="text-[11px] font-black uppercase tracking-widest">背景简介</h5></div>
                              <p className="text-slate-600 leading-relaxed font-medium text-lg border-l-4 border-indigo-100 pl-6 py-1">{persona.bio}</p>
                            </section>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                              <section className="space-y-4">
                                <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 w-fit"><TargetIcon size={14} /><h5 className="text-[10px] font-black">保障诉求</h5></div>
                                <ul className="space-y-2">{persona.insuranceNeeds.slice(0, 3).map((need, i) => <li key={i} className="text-slate-800 font-bold text-sm">0{i+1}. {need}</li>)}</ul>
                              </section>
                              <section className="space-y-4">
                                <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 w-fit"><AlertCircle size={14} /><h5 className="text-[10px] font-black">关键痛点</h5></div>
                                <ul className="space-y-2">{persona.painPoints.slice(0, 3).map((pain, i) => <li key={i} className="text-slate-800 font-bold text-sm">× {pain}</li>)}</ul>
                              </section>
                            </div>
                            <div className="bg-emerald-50/40 rounded-[36px] p-8 border border-emerald-100 flex items-start gap-6 mt-auto shadow-inner">
                              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600"><Zap className="fill-emerald-600" /></div>
                              <div className="space-y-3">
                                <h5 className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">设计机会洞察</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                  {persona.opportunityPoints.slice(0, 4).map((op, i) => <div key={i} className="text-emerald-900 font-bold text-sm flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-emerald-500" /> {op}</div>)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className={`transition-all duration-500 ${isExpanded ? 'bg-slate-50' : 'bg-white'}`}>
                          <button onClick={() => togglePersonaExpand(idx)} className="w-full py-8 px-10 lg:px-14 flex items-center justify-between hover:bg-slate-50/80 transition-colors border-t border-slate-50">
                            <div className="flex items-center gap-5">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Database size={22} /></div>
                              <div className="text-left"><h5 className="text-xl font-black text-slate-900">调研证据链</h5><p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">原始访谈金句与事实依据</p></div>
                            </div>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'rotate-180 bg-slate-200 text-slate-900' : 'bg-slate-50 text-slate-400'}`}><ChevronDown size={24} /></div>
                          </button>
                          {isExpanded && (
                            <div className="px-10 lg:px-14 pb-14 animate-in slide-in-from-top-6 duration-700">
                              <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                                {persona.evidence.map((quote, qIdx) => (
                                  <div key={qIdx} className="bg-white p-8 rounded-[36px] border border-slate-200 relative"><div className="absolute -top-4 -left-4 bg-slate-900 text-white w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"><Quote size={18} className="fill-white" /></div><p className="text-slate-600 font-semibold italic text-lg leading-relaxed">“{quote}”</p></div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case AnalysisType.JOURNEY_MAP:
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            {selectedPersonaForJourney ? (
              <div className="space-y-8">
                <div className="bg-white p-10 rounded-[48px] border border-indigo-100 shadow-xl shadow-indigo-50 flex flex-col md:flex-row items-center gap-10">
                  <div className="flex items-center gap-6 border-r border-slate-100 pr-10">
                    <div className="w-20 h-20 rounded-[32px] overflow-hidden border-4 border-indigo-50 shadow-md">
                      {selectedPersonaForJourney.imageUrl ? <img src={selectedPersonaForJourney.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200"><UserCircle size={48} /></div>}
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">画像：{selectedPersonaForJourney.name}</p>
                      <h3 className="text-2xl font-black text-slate-900">旅程地图：{journeyTheme}</h3>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-6">
                      <input 
                        type="text" 
                        value={journeyTheme} 
                        onChange={(e) => setJourneyTheme(e.target.value)}
                        className="flex-1 px-6 py-4 bg-slate-50 border-2 border-indigo-50 rounded-[24px] text-base font-bold focus:outline-none focus:ring-8 focus:ring-indigo-100 focus:bg-white transition-all shadow-inner"
                      />
                      <button 
                        onClick={handleGenerateJourney}
                        disabled={loading || !journeyTheme}
                        className="px-10 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="animate-spin" /> : '重新推演旅程'}
                      </button>
                    </div>
                  </div>
                </div>

                {journeyResult && (
                  <div className="bg-white rounded-[56px] shadow-2xl shadow-slate-200 overflow-hidden border border-slate-100 flex flex-col">
                    <div className="flex overflow-x-auto custom-scrollbar border-b border-slate-100">
                      <div className="w-40 flex-shrink-0 flex flex-col pt-24 border-r border-slate-100 bg-slate-50/80">
                        <CategoryLabel label="步骤阶段" className="h-24" />
                        <CategoryLabel label="用户需求" className="h-44" />
                        <CategoryLabel label="典型行为" className="h-48" />
                        <CategoryLabel label="触点渠道" className="h-24" />
                        <CategoryLabel label="情绪波动" className="h-40" />
                        <CategoryLabel label="痛点问题" className="h-44" />
                        <CategoryLabel label="机会点" className="h-44" />
                      </div>

                      <div className="flex relative bg-white">
                        {journeyResult.map((stage, idx) => {
                          let headerColor = "bg-teal-700 shadow-teal-100";
                          let subHeaderColor = "bg-teal-50 text-teal-800 border-teal-100";
                          if (idx >= 3) {
                             headerColor = "bg-teal-400 shadow-teal-50";
                             subHeaderColor = "bg-teal-50/50 text-teal-600 border-teal-50";
                          } else if (idx >= 1) {
                             headerColor = "bg-teal-500 shadow-teal-50";
                             subHeaderColor = "bg-teal-50 text-teal-700 border-teal-100";
                          }

                          return (
                            <div key={idx} className={`w-[${colWidth}px] flex-shrink-0 flex flex-col border-r border-slate-50 group hover:bg-slate-50/30 transition-colors`} style={{ width: colWidth }}>
                              <div className="h-24 p-3 flex flex-col gap-2 bg-slate-50/20">
                                <div className={`h-8 ${headerColor} flex items-center justify-center rounded-xl shadow-lg`}>
                                   <span className="text-white font-black text-[11px] uppercase tracking-widest">{idx < 2 ? '购保前' : idx < 4 ? '购保中' : '购保后'}</span>
                                </div>
                                <div className={`h-10 ${subHeaderColor} flex items-center justify-center rounded-xl border-2`}>
                                  <span className="font-black text-sm px-3 text-center leading-tight truncate w-full">{stage.phase}</span>
                                </div>
                              </div>

                              <div className="h-44 p-6 border-b border-slate-50">
                                <ul className="space-y-2">
                                  {stage.userNeeds.map((n, i) => <li key={i} className="text-[13px] font-bold text-slate-800 leading-snug flex gap-2"><span className="text-teal-500">·</span> {n}</li>)}
                                </ul>
                              </div>

                              <div className="h-48 p-6 border-b border-slate-50 bg-slate-50/5">
                                <ul className="space-y-2">
                                  {stage.actions.map((a, i) => <li key={i} className="text-[13px] font-medium text-slate-500 leading-snug pl-3 border-l-2 border-slate-100">{a}</li>)}
                                </ul>
                              </div>

                              <div className="h-24 p-6 border-b border-slate-50 flex items-center justify-center text-center">
                                <p className="text-[12px] font-black text-slate-400 uppercase tracking-tight">{stage.touchpoints.join(', ')}</p>
                              </div>

                              <div className="h-40 border-b border-slate-50 relative overflow-hidden bg-slate-50/20">
                                <div className={`absolute z-20 w-full px-4 text-center ${stage.emotions >= 3 ? 'bottom-20' : 'top-20'} transition-all group-hover:scale-105`}>
                                  <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xl inline-block max-w-[180px]">
                                    <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">“{stage.emotionInsight}”</p>
                                  </div>
                                </div>
                                <div 
                                  className="absolute left-1/2 -translate-x-1/2 z-30 flex flex-col items-center"
                                  style={{ top: `${150 - ((stage.emotions - 1) / 4) * 100 - 25 - 12}px` }}
                                >
                                  <div className="w-4 h-4 rounded-full bg-teal-800 border-4 border-white shadow-lg"></div>
                                  <div className="mt-1.5 transform scale-125"><EmotionIcon score={stage.emotions} size={20} /></div>
                                </div>
                              </div>

                              <div className="h-44 p-6 border-b border-slate-50">
                                <ul className="space-y-2">
                                  {stage.painPoints.map((p, i) => <li key={i} className="text-[13px] font-black text-rose-700 leading-snug flex gap-2"><span>✕</span> {p}</li>)}
                                </ul>
                              </div>

                              <div className="h-44 p-6 border-b border-slate-50 bg-teal-50/30">
                                <ul className="space-y-2">
                                  {stage.opportunities.map((o, i) => <li key={i} className="text-[13px] font-black text-teal-900 leading-snug flex gap-2"><Zap size={14} className="text-teal-500 flex-shrink-0 mt-0.5" /> {o}</li>)}
                                </ul>
                              </div>
                            </div>
                          );
                        })}

                        <svg className="absolute top-[436px] left-0 pointer-events-none z-10 overflow-visible" width={journeyResult.length * colWidth} height="150">
                          <path 
                            d={emotionCurvePath(journeyResult)} 
                            fill="none" 
                            stroke="#0f766e" 
                            strokeWidth="3" 
                            strokeDasharray="6 4"
                            className="opacity-20"
                          />
                        </svg>
                      </div>
                    </div>

                    <div className="p-8 bg-slate-900 text-white flex justify-between items-center text-[11px] font-black uppercase tracking-widest">
                      <div className="flex items-center gap-4">
                        <Activity className="text-teal-400 w-5 h-5" />
                        <span className="text-slate-400">Persona Profile: {selectedPersonaForJourney.name} / {selectedPersonaForJourney.role}</span>
                      </div>
                      <div className="flex gap-6">
                        <button className="flex items-center gap-3 hover:text-teal-400 transition-colors bg-white/10 px-6 py-2 rounded-xl"><Upload size={14} /> 下载分析结果</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[500px] text-center space-y-6">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center border border-dashed border-slate-200"><Users size={32} className="text-slate-200" /></div>
                <h3 className="text-lg font-black text-slate-900">画像数据未挂载</h3>
                <p className="text-slate-400 text-xs max-w-xs leading-relaxed">请先在「多维画像聚类」模块生成画像，并在画像卡片点击“生成专属旅程图”按钮进入此视图。</p>
                <button onClick={() => setActiveTab(AnalysisType.PERSONA)} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl">前往画像中心</button>
              </div>
            )}
          </div>
        );

      case AnalysisType.COMPETITOR:
        return (
          <div className="max-w-4xl mx-auto space-y-10 animate-in zoom-in-95 duration-500">
            {competitorResult && (
              <>
                <div className="bg-white p-12 rounded-[56px] shadow-2xl border border-slate-100">
                  <h3 className="text-2xl font-black mb-8 flex items-center gap-4"><Sparkles className="text-indigo-600 w-8 h-8" /> 核心竞品分析结论</h3>
                  <p className="text-xl text-slate-600 font-bold italic leading-relaxed border-l-8 border-indigo-600 pl-8">“{competitorResult.conclusion}”</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-lg"><h4 className="text-lg font-black mb-6 flex items-center gap-3 text-blue-500"><ImageIcon /> 视觉与交互</h4><p className="text-base text-slate-600 leading-relaxed font-medium">{competitorResult.visualAnalysis}</p></div>
                  <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-lg"><h4 className="text-lg font-black mb-6 flex items-center gap-3 text-indigo-500"><LayoutGrid /> 功能链路</h4><p className="text-base text-slate-600 leading-relaxed font-medium">{competitorResult.functionalAnalysis}</p></div>
                  <div className="bg-blue-50/50 p-10 rounded-[48px] border border-blue-100"><h4 className="text-lg font-black mb-6 text-blue-900">核心优势</h4><ul className="space-y-3">{competitorResult.pros?.map((p: any, i: any) => <li key={i} className="font-bold text-blue-800 flex gap-3"><span className="text-blue-400">✓</span> {p}</li>)}</ul></div>
                  <div className="bg-rose-50/50 p-10 rounded-[48px] border border-rose-100"><h4 className="text-lg font-black mb-6 text-rose-900">待改良点</h4><ul className="space-y-3">{competitorResult.cons?.map((c: any, i: any) => <li key={i} className="font-bold text-rose-800 flex gap-3"><span className="text-rose-400">!</span> {c}</li>)}</ul></div>
                </div>
              </>
            )}
          </div>
        );

      case AnalysisType.OPPORTUNITIES:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            {opportunityResult?.map((opp, i) => (
              <div key={i} className="bg-white p-10 rounded-[48px] shadow-sm border border-slate-100 hover:shadow-2xl hover:border-indigo-100 transition-all flex flex-col">
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full uppercase mb-6 block w-fit tracking-widest border border-indigo-100">{opp.category}</span>
                <p className="text-slate-900 font-black text-xl leading-snug mb-8">{opp.description}</p>
                <div className="flex flex-col gap-3 mt-auto border-t pt-6">
                  <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">商业影响力</span><span className="text-xs font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{opp.impact}</span></div>
                  <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">落地可行性</span><span className="text-xs font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{opp.feasibility}</span></div>
                </div>
              </div>
            ))}
          </div>
        );
      
      default:
        return null;
    }
  };

  if (isLanding) {
    return renderLandingPage();
  }

  return (
    <div className="min-h-screen flex bg-slate-50 font-['Inter'] animate-in fade-in duration-500">
      <aside className="w-80 bg-white border-r border-slate-200 hidden lg:flex flex-col sticky top-0 h-screen z-50 shadow-2xl">
        <div className="p-10">
          <button 
            onClick={() => setIsLanding(true)}
            className="flex items-center gap-4 mb-16 hover:opacity-80 transition-all text-left"
          >
            <div className="w-12 h-12 bg-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100"><ShieldCheck className="w-8 h-8" /></div>
            <div><h1 className="text-xl font-black text-slate-900 tracking-tight">InsureInsight</h1><span className="text-[9px] font-black text-indigo-600 uppercase mt-1 block tracking-[0.2em]">智能需求实验室</span></div>
          </button>
          <nav className="space-y-3">
            <SidebarItem icon={<LayoutTemplate />} label="综合报告生成" active={activeTab === AnalysisType.COMPREHENSIVE} onClick={() => setActiveTab(AnalysisType.COMPREHENSIVE)} />
            <SidebarItem icon={<LucidePieChart />} label="调研统计分析" active={activeTab === AnalysisType.DATA_ANALYSIS} onClick={() => setActiveTab(AnalysisType.DATA_ANALYSIS)} />
            <SidebarItem icon={<Users />} label="用户画像聚类" active={activeTab === AnalysisType.PERSONA} onClick={() => setActiveTab(AnalysisType.PERSONA)} />
            <SidebarItem icon={<LucideMap />} label="用户体验映射" active={activeTab === AnalysisType.JOURNEY_MAP} onClick={() => setActiveTab(AnalysisType.JOURNEY_MAP)} />
            <SidebarItem icon={<Search />} label="竞品透视分析" active={activeTab === AnalysisType.COMPETITOR} onClick={() => setActiveTab(AnalysisType.COMPETITOR)} />
            <SidebarItem icon={<Lightbulb />} label="设计机会洞察" active={activeTab === AnalysisType.OPPORTUNITIES} onClick={() => setActiveTab(AnalysisType.OPPORTUNITIES)} />
          </nav>
        </div>
        <div className="mt-auto p-10">
          <div className="bg-slate-900 p-6 rounded-3xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-lg">AI</div>
            <div>
              <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-0.5">Gemini 3 Flash</p>
              <p className="text-[10px] font-black text-white uppercase tracking-tighter">模型认知引擎</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <header className="h-24 border-b border-slate-200 bg-white/60 backdrop-blur-3xl sticky top-0 z-40 px-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button 
               onClick={() => setIsLanding(true)}
               className="lg:hidden w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500"
             >
               <LayoutGrid size={20} />
             </button>
             <div>
                <h2 className="text-2xl font-black text-slate-900">
                  {activeTab === AnalysisType.DATA_ANALYSIS && "调研全量统计与回归分析"}
                  {activeTab === AnalysisType.PERSONA && "多模态用户画像聚类分析"}
                  {activeTab === AnalysisType.JOURNEY_MAP && "特定画像全周期体验地图"}
                  {activeTab === AnalysisType.COMPETITOR && "多维产品竞品深度对比"}
                  {activeTab === AnalysisType.OPPORTUNITIES && "行业趋势与设计机会点"}
                  {activeTab === AnalysisType.COMPREHENSIVE && "综合全链路分析报告"}
                </h2>
                <div className="flex items-center gap-2 mt-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cognitive Intelligence Active</span></div>
             </div>
          </div>
        </header>

        <div className="p-12 max-w-7xl mx-auto w-full space-y-8 pb-24">
          {activeTab !== AnalysisType.JOURNEY_MAP && (
            <section className="bg-white p-10 rounded-[48px] shadow-sm border border-slate-200 space-y-8 animate-in slide-in-from-top-4 duration-500">
              <div className="flex flex-col md:flex-row gap-10">
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                      {hasSourceData ? <MessageSquareQuote size={14} className="text-indigo-600" /> : <Sparkles size={14} className="text-indigo-600" />} 
                      {hasSourceData ? "输入具体分析要求" : "原始数据或访谈内容"}
                    </label>
                    <button onClick={() => document.getElementById('multimodalUpload')?.click()} className="text-[9px] font-black flex items-center gap-2 text-indigo-600 bg-indigo-50/60 px-4 py-2 rounded-xl uppercase tracking-widest border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all"><Paperclip size={12} /> 附件上传 (Excel/Doc/图片)</button>
                  </div>
                  <div className="relative group">
                    <textarea 
                      className={`w-full h-32 p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] focus:ring-8 focus:ring-indigo-100 focus:border-indigo-600 focus:bg-white focus:outline-none transition-all resize-none text-slate-800 text-base font-semibold placeholder:text-slate-300 ${hasSourceData ? 'border-indigo-100' : ''}`}
                      placeholder={hasSourceData ? "已加载数据。请告诉 AI 您的偏好..." : "粘贴访谈文本、问卷原始数据，或在上方上传文件附件进行分析..."}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {excelFileName && <div className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black"><FileSpreadsheet size={14} /> {excelFileName} <button onClick={clearExcel} className="hover:text-rose-300 ml-1"><X size={14}/></button></div>}
                    {attachedFiles.map(file => <div key={file.id} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black">{file.type.includes('image') ? <ImageIcon size={14}/> : <FileText size={14}/>} {file.name} <button onClick={() => removeAttachedFile(file.id)} className="hover:text-rose-300 ml-1"><X size={14}/></button></div>)}
                  </div>
                  <input id="multimodalUpload" type="file" className="hidden" accept=".xlsx, .xls, .csv, .pdf, .doc, .docx, image/*" multiple onChange={handleMultimodalUpload} />
                </div>
                {activeTab === AnalysisType.COMPETITOR && (
                  <div className="w-full md:w-80 space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">竞品截图库</label>
                    <div className="h-32 border-4 border-dashed border-slate-100 rounded-[32px] flex flex-col items-center justify-center text-slate-400 cursor-pointer relative overflow-hidden bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition-all" onClick={() => document.getElementById('imageUpload')?.click()}>
                      {uploadedImage ? <img src={uploadedImage} className="w-full h-full object-cover p-2 rounded-[28px]" /> : <div className="flex flex-col items-center gap-2 opacity-30"><ImageIcon size={32} strokeWidth={1} /><span className="text-[9px] font-black uppercase tracking-widest">上传截图</span></div>}
                      <input id="imageUpload" type="file" className="hidden" accept="image/*" onChange={handleCompetitorImage} />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end pt-6 border-t border-slate-50"><button className="px-10 py-4 bg-slate-900 text-white rounded-[24px] font-black flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-xl disabled:opacity-50" onClick={runAnalysis} disabled={loading}>{loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}<span className="text-xs uppercase tracking-widest font-black">{loading ? '解析中...' : '开始生成智能分析'}</span></button></div>
            </section>
          )}

          <section className="min-h-[500px] relative">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-[400px] space-y-8 animate-pulse">
                <div className="relative w-24 h-24"><div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-[28px] animate-spin"></div><div className="absolute inset-0 flex items-center justify-center text-indigo-600"><ShieldCheck size={32} /></div></div>
                <div className="text-center space-y-2"><p className="text-xl font-black text-slate-900 tracking-tighter uppercase">AI 推演中</p><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">正在对多模态数据进行全链路关联分析...</p></div>
              </div>
            ) : renderContent()}
          </section>
        </div>
      </main>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 12px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; border: 2px solid #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

const SectionTitle: React.FC<{icon: any, title: string}> = ({ icon, title }) => (
  <div className="flex items-center gap-5 border-b border-slate-200 pb-6">
    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900">{React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}</div>
    <h3 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{title}</h3>
  </div>
);

const LandingCard: React.FC<{icon: any, title: string, desc: string, color: string, onClick: () => void, isNew?: boolean}> = ({ icon, title, desc, color, onClick, isNew }) => (
  <button 
    onClick={onClick}
    className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all text-left flex flex-col group relative overflow-hidden h-[340px]"
  >
    {isNew && <div className="absolute top-8 right-8 bg-indigo-600 text-white text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest shadow-lg shadow-indigo-100">Recommended</div>}
    <div className={`w-20 h-20 ${color} rounded-[28px] flex items-center justify-center text-white mb-8 shadow-lg shadow-slate-100 group-hover:scale-110 transition-transform duration-500`}>
      {icon}
    </div>
    <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{title}</h3>
    <p className="text-slate-500 font-medium text-sm leading-relaxed flex-1">
      {desc}
    </p>
    <div className="mt-6 flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
      立即开始 <ArrowRight size={14} />
    </div>
    <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-[0.03] rounded-full translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-700`}></div>
  </button>
);

const CategoryLabel: React.FC<{ label: string, className?: string }> = ({ label, className = "h-10" }) => (
  <div className={`flex items-center justify-center bg-teal-50/60 border-b border-slate-100 px-6 text-center ${className}`}>
    <span className="text-[13px] font-black text-teal-900 uppercase tracking-widest leading-tight">{label}</span>
  </div>
);

const SidebarItem: React.FC<{icon: any, label: string, active?: boolean, onClick: () => void}> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-5 px-8 py-5 rounded-[28px] transition-all relative group ${active ? 'bg-slate-900 text-white shadow-2xl' : 'text-slate-500 hover:bg-slate-100/60 hover:text-slate-900'}`}>
    <span className={`${active ? 'text-indigo-400' : 'text-slate-400'} transition-colors`}>{React.cloneElement(icon as React.ReactElement<any>, { size: 22 })}</span>
    <span className="text-[14px] font-black tracking-tight">{label}</span>
    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-10 bg-indigo-600 rounded-r-2xl shadow-lg"></div>}
  </button>
);

export default App;
