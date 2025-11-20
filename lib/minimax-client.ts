/**
 * Minimax AI Client Library
 * Provides integration with Minimax's text, speech, and video generation APIs
 * 
 * ELI MOTORS LTD - GarageManager Pro
 * Advanced AI capabilities for automotive service management
 */

export interface MinimaxTextRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
}

export interface MinimaxTextResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface MinimaxSpeechRequest {
  text: string;
  model?: string;
  voice_id?: string;
  speed?: number;
  vol?: number;
  pitch?: number;
  audio_sample_rate?: number;
  bitrate?: number;
  format?: 'mp3' | 'wav' | 'pcm';
}

export interface MinimaxSpeechResponse {
  trace_id: string;
  audio_file: string; // Base64 encoded audio
  extra_info?: any;
}

export interface MinimaxVideoRequest {
  prompt: string;
  model?: string;
  prompt_optimizer?: boolean;
}

export interface MinimaxVideoResponse {
  task_id: string;
  status: 'processing' | 'completed' | 'failed';
  video_url?: string;
  error?: string;
}

export class MinimaxClient {
  private apiKey: string;
  private textApiUrl: string;
  private speechApiUrl: string;
  private videoApiUrl: string;
  private textModel: string;
  private speechModel: string;
  private videoModel: string;

  constructor() {
    this.apiKey = process.env.MINIMAX_API_KEY || '';
    this.textApiUrl = process.env.MINIMAX_TEXT_API_URL || 'https://api.minimax.chat/v1/text/chatcompletion_v2';
    this.speechApiUrl = process.env.MINIMAX_SPEECH_API_URL || 'https://api.minimax.chat/v1/t2a_v2';
    this.videoApiUrl = process.env.MINIMAX_VIDEO_API_URL || 'https://api.minimax.chat/v1/video_generation';
    this.textModel = process.env.MINIMAX_TEXT_MODEL || 'abab6.5s-chat';
    this.speechModel = process.env.MINIMAX_SPEECH_MODEL || 'speech-02';
    this.videoModel = process.env.MINIMAX_VIDEO_MODEL || 'video-01';

    if (!this.apiKey) {
      throw new Error('MINIMAX_API_KEY environment variable is required');
    }
  }

  /**
   * Generate text completion using Minimax text model
   */
  async generateText(request: MinimaxTextRequest): Promise<MinimaxTextResponse> {
    try {
      console.log('[MINIMAX-CLIENT] Generating text completion...');
      
      const response = await fetch(this.textApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model || this.textModel,
          messages: request.messages,
          max_tokens: request.max_tokens || 1000,
          temperature: request.temperature || 0.7,
          top_p: request.top_p || 0.9,
          stream: request.stream || false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Minimax Text API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('[MINIMAX-CLIENT] Text generation completed successfully');
      return result;
    } catch (error) {
      console.error('[MINIMAX-CLIENT] Text generation error:', error);
      throw error;
    }
  }

  /**
   * Generate speech from text using Minimax speech model
   */
  async generateSpeech(request: MinimaxSpeechRequest): Promise<MinimaxSpeechResponse> {
    try {
      console.log('[MINIMAX-CLIENT] Generating speech from text...');
      
      const response = await fetch(this.speechApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model || this.speechModel,
          text: request.text,
          voice_id: request.voice_id || 'male-qn-qingse',
          speed: request.speed || 1.0,
          vol: request.vol || 1.0,
          pitch: request.pitch || 0,
          audio_sample_rate: request.audio_sample_rate || 32000,
          bitrate: request.bitrate || 128000,
          format: request.format || 'mp3',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Minimax Speech API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('[MINIMAX-CLIENT] Speech generation completed successfully');
      return result;
    } catch (error) {
      console.error('[MINIMAX-CLIENT] Speech generation error:', error);
      throw error;
    }
  }

  /**
   * Generate video from text prompt using Minimax video model
   */
  async generateVideo(request: MinimaxVideoRequest): Promise<MinimaxVideoResponse> {
    try {
      console.log('[MINIMAX-CLIENT] Generating video from prompt...');
      
      const response = await fetch(this.videoApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model || this.videoModel,
          prompt: request.prompt,
          prompt_optimizer: request.prompt_optimizer !== false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Minimax Video API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('[MINIMAX-CLIENT] Video generation initiated successfully');
      return result;
    } catch (error) {
      console.error('[MINIMAX-CLIENT] Video generation error:', error);
      throw error;
    }
  }

  /**
   * Check video generation status
   */
  async checkVideoStatus(taskId: string): Promise<MinimaxVideoResponse> {
    try {
      console.log(`[MINIMAX-CLIENT] Checking video status for task: ${taskId}`);
      
      const response = await fetch(`${this.videoApiUrl}/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Minimax Video Status API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`[MINIMAX-CLIENT] Video status check completed: ${result.status}`);
      return result;
    } catch (error) {
      console.error('[MINIMAX-CLIENT] Video status check error:', error);
      throw error;
    }
  }

  /**
   * Generate automotive service summary using AI
   */
  async generateServiceSummary(vehicleData: any, serviceHistory: any[]): Promise<string> {
    const messages = [
      {
        role: 'system' as const,
        content: `You are an expert automotive service advisor for ELI MOTORS LTD, serving Hendon since 1979. 
        Generate professional, concise service summaries and recommendations based on vehicle data and service history.
        Focus on MOT requirements, maintenance schedules, and safety recommendations.`
      },
      {
        role: 'user' as const,
        content: `Please analyze this vehicle and provide a service summary:
        
        Vehicle: ${vehicleData.make} ${vehicleData.model} (${vehicleData.registration})
        Year: ${vehicleData.year}
        MOT Expiry: ${vehicleData.motExpiryDate}
        
        Recent Service History:
        ${serviceHistory.map(service => `- ${service.date}: ${service.description}`).join('\n')}
        
        Please provide:
        1. Current vehicle status
        2. Upcoming maintenance recommendations
        3. MOT preparation advice
        4. Any safety concerns`
      }
    ];

    const response = await this.generateText({ messages });
    return response.choices[0]?.message?.content || 'Unable to generate service summary';
  }

  /**
   * Generate MOT reminder message using AI
   */
  async generateMOTReminder(vehicleData: any, customerData: any): Promise<string> {
    const messages = [
      {
        role: 'system' as const,
        content: `You are creating MOT reminder messages for ELI MOTORS LTD customers. 
        Generate friendly, professional reminders that include key information and encourage booking.
        Keep messages concise and include contact information.`
      },
      {
        role: 'user' as const,
        content: `Create an MOT reminder for:
        
        Customer: ${customerData.firstName} ${customerData.lastName}
        Vehicle: ${vehicleData.make} ${vehicleData.model} (${vehicleData.registration})
        MOT Expiry: ${vehicleData.motExpiryDate}
        Days until expiry: ${vehicleData.daysUntilExpiry}
        
        Include:
        - Friendly greeting
        - MOT expiry information
        - Booking encouragement
        - Contact details: 0208 203 6449
        - Professional closing`
      }
    ];

    const response = await this.generateText({ messages });
    return response.choices[0]?.message?.content || 'MOT reminder could not be generated';
  }
}

// Singleton instance
let minimaxClient: MinimaxClient | null = null;

export function getMinimaxClient(): MinimaxClient {
  if (!minimaxClient) {
    minimaxClient = new MinimaxClient();
  }
  return minimaxClient;
}
