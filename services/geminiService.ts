
import { GoogleGenAI, Type } from "@google/genai";
import { PersonaData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-3-flash-preview';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

export interface MediaPart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

async function callWithRetry(fn: () => Promise<any>, maxRetries = 3, initialDelay = 1000) {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isRetryable = err?.message?.includes('500') || 
                          err?.message?.includes('xhr') || 
                          err?.message?.includes('Rpc failed') ||
                          err?.message?.includes('fetch');
      if (!isRetryable || i === maxRetries - 1) break;
      const delay = initialDelay * Math.pow(2, i);
      console.warn(`API call failed, retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`, err);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export const analyzeData = async (textData: string, instructions: string, mediaParts: MediaPart[] = []) => {
  return callWithRetry(async () => {
    const contents: any = {
      parts: [
        {
          text: `你是一名保险调研数据高级审计专家。请对提供的原始调研数据进行地毯式、全量化的统计与深度回归分析。
          
          **极其重要的任务目标：**
          1. **全量识别**：请从数据源中识别出【每一道】调研题目。
          2. **标准统计**：为每一道题目输出完整的频数分布数据。
          3. **回归分析**：挖掘变量间的深层联系。
          4. **洞察提取**：基于完整数据提取用户痛点和设计机会点。

          **数据源内容：**
          \n\n${textData.substring(0, 30000)}
          
          **输出要求：**
          - 必须输出中文 JSON。`
        },
        ...mediaParts
      ]
    };
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        thinkingConfig: { thinkingBudget: 4000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            charts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  totalResponses: { type: Type.INTEGER },
                  data: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        value: { type: Type.NUMBER }
                      },
                      required: ["label", "value"]
                    }
                  }
                },
                required: ["title", "totalResponses", "data"]
              }
            },
            correlations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  independentVar: { type: Type.STRING },
                  dependentVar: { type: Type.STRING },
                  correlation: { type: Type.NUMBER },
                  insight: { type: Type.STRING }
                },
                required: ["independentVar", "dependentVar", "correlation", "insight"]
              }
            },
            painPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING }
          },
          required: ["charts", "correlations", "painPoints", "opportunities", "summary"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const generatePersonaClusters = async (inputData: string, instructions: string, mediaParts: MediaPart[] = []) => {
  return callWithRetry(async () => {
    const contents: any = {
      parts: [
        {
          text: `你是一名保险行业深度洞察专家。请基于原始数据进行用户聚类分析，并构建详细画像及证据链。
          
          **数据源内容：**
          \n\n${inputData.substring(0, 20000)}`
        },
        ...mediaParts
      ]
    };

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clusters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  role: { type: Type.STRING },
                  age: { type: Type.NUMBER },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  bio: { type: Type.STRING },
                  goals: { type: Type.ARRAY, items: { type: Type.STRING } },
                  painPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                  insuranceNeeds: { type: Type.ARRAY, items: { type: Type.STRING } },
                  opportunityPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                  evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                  imagePrompt: { type: Type.STRING }
                },
                required: ["name", "role", "age", "tags", "bio", "goals", "painPoints", "insuranceNeeds", "opportunityPoints", "evidence", "imagePrompt"]
              }
            }
          },
          required: ["clusters"]
        }
      }
    });
    const result = JSON.parse(response.text || "{}");
    return result.clusters || [];
  });
};

export const generatePersonaImage = async (prompt: string) => {
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [
          {
            text: `A realistic, high-quality portrait photograph for a professional user persona: ${prompt}. Clean studio background, natural lighting, professional insurance customer style.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      },
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  });
};

export const generateJourneyMap = async (persona: PersonaData, theme: string, rawData: string) => {
  return callWithRetry(async () => {
    const prompt = `生成保险体验地图。涵盖：需求、行为、触点、感受（1-5）、情绪旁白、问题点和机会点。
    画像：${persona.name} (${persona.role})
    旅程：${theme}
    数据：${rawData.substring(0, 10000)}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              phase: { type: Type.STRING },
              userNeeds: { type: Type.ARRAY, items: { type: Type.STRING } },
              actions: { type: Type.ARRAY, items: { type: Type.STRING } },
              touchpoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              emotions: { type: Type.NUMBER },
              emotionInsight: { type: Type.STRING },
              painPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              opportunities: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["phase", "userNeeds", "actions", "touchpoints", "emotions", "emotionInsight", "painPoints", "opportunities"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  });
};

export const analyzeCompetitor = async (text: string, instructions: string, base64Image?: string) => {
  return callWithRetry(async () => {
    const parts: any[] = [{ text: `你是一名保险产品专家。请对该竞品进行详细的功能与设计分析。\n文字描述：\n${text}` }];
    if (base64Image) parts.push({ inlineData: { data: base64Image.split(',')[1], mimeType: "image/png" } });
    
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            visualAnalysis: { type: Type.STRING },
            functionalAnalysis: { type: Type.STRING },
            pros: { type: Type.ARRAY, items: { type: Type.STRING } },
            cons: { type: Type.ARRAY, items: { type: Type.STRING } },
            conclusion: { type: Type.STRING }
          },
          required: ["functionalAnalysis", "conclusion", "visualAnalysis", "pros", "cons"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const analyzeOpportunities = async (inputData: string, instructions: string) => {
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `挖掘保险设计机会点。输入：\n\n${inputData}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              description: { type: Type.STRING },
              impact: { type: Type.STRING },
              feasibility: { type: Type.STRING }
            },
            required: ["category", "description", "impact", "feasibility"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  });
};

export const analyzeComprehensive = async (textData: string, instructions: string, mediaParts: MediaPart[] = []) => {
  return callWithRetry(async () => {
    const prompt = `你是一名顶级保险咨询专家。请对提供的问卷数据进行一次性【全链路综合分析】，并输出一份完整的行业级分析报告。报告需包含：
    1. **调研数据深度分析**：全量识别题目、统计分布、关联回归分析。
    2. **用户画像聚类**：识别核心客群，构建带证据链的详细画像。
    3. **典型用户体验地图**：针对最具代表性的画像推演全周期购保旅程。
    4. **全局设计机会点**：挖掘高价值设计机会。

    原始数据：\n${textData.substring(0, 30000)}
    特定要求：${instructions || "无"}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ parts: [{ text: prompt }, ...mediaParts] }],
      config: {
        thinkingConfig: { thinkingBudget: 8000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "全篇综合报告概述" },
            dataAnalysis: {
              type: Type.OBJECT,
              properties: {
                charts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, totalResponses: { type: Type.INTEGER }, data: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, value: { type: Type.NUMBER } } } } } } },
                correlations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { independentVar: { type: Type.STRING }, dependentVar: { type: Type.STRING }, correlation: { type: Type.NUMBER }, insight: { type: Type.STRING } } } },
                painPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                opportunities: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            personas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  role: { type: Type.STRING },
                  age: { type: Type.NUMBER },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  bio: { type: Type.STRING },
                  goals: { type: Type.ARRAY, items: { type: Type.STRING } },
                  painPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                  insuranceNeeds: { type: Type.ARRAY, items: { type: Type.STRING } },
                  opportunityPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                  evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                  imagePrompt: { type: Type.STRING }
                }
              }
            },
            journey: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  phase: { type: Type.STRING },
                  userNeeds: { type: Type.ARRAY, items: { type: Type.STRING } },
                  actions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  touchpoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                  emotions: { type: Type.NUMBER },
                  emotionInsight: { type: Type.STRING },
                  painPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                  opportunities: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            },
            opportunities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  description: { type: Type.STRING },
                  impact: { type: Type.STRING },
                  feasibility: { type: Type.STRING }
                }
              }
            }
          },
          required: ["summary", "dataAnalysis", "personas", "journey", "opportunities"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};
