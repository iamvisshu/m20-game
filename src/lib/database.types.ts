export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      attributes: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          metadata: Json
          name: string
          updated_at: string
          value_type: Database['public']['Enums']['attribute_value_type']
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
          value_type?: Database['public']['Enums']['attribute_value_type']
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
          value_type?: Database['public']['Enums']['attribute_value_type']
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      entities: {
        Row: {
          active: boolean
          canonical_name: string
          created_at: string
          description: string | null
          id: string
          metadata: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          canonical_name: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          canonical_name?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          updated_at?: string
        }
        Relationships: []
      }
      entity_attribute_stats: {
        Row: {
          attribute_id: string
          entity_id: string
          evidence_count: number
          negative_weight: number
          positive_weight: number
          updated_at: string
        }
        Insert: {
          attribute_id: string
          entity_id: string
          evidence_count?: number
          negative_weight?: number
          positive_weight?: number
          updated_at?: string
        }
        Update: {
          attribute_id?: string
          entity_id?: string
          evidence_count?: number
          negative_weight?: number
          positive_weight?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'entity_attribute_stats_attribute_id_fkey'
            columns: ['attribute_id']
            isOneToOne: false
            referencedRelation: 'attributes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'entity_attribute_stats_entity_id_fkey'
            columns: ['entity_id']
            isOneToOne: false
            referencedRelation: 'entities'
            referencedColumns: ['id']
          },
        ]
      }
      entity_attributes: {
        Row: {
          attribute_id: string
          confidence: number
          entity_id: string
          evidence_count: number
          negative_evidence: number
          positive_evidence: number
          updated_at: string
          value_boolean: boolean | null
        }
        Insert: {
          attribute_id: string
          confidence?: number
          entity_id: string
          evidence_count?: number
          negative_evidence?: number
          positive_evidence?: number
          updated_at?: string
          value_boolean?: boolean | null
        }
        Update: {
          attribute_id?: string
          confidence?: number
          entity_id?: string
          evidence_count?: number
          negative_evidence?: number
          positive_evidence?: number
          updated_at?: string
          value_boolean?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: 'entity_attributes_attribute_id_fkey'
            columns: ['attribute_id']
            isOneToOne: false
            referencedRelation: 'attributes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'entity_attributes_entity_id_fkey'
            columns: ['entity_id']
            isOneToOne: false
            referencedRelation: 'entities'
            referencedColumns: ['id']
          },
        ]
      }
      entity_categories: {
        Row: {
          category_id: string
          created_at: string
          entity_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          entity_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          entity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'entity_categories_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'entity_categories_entity_id_fkey'
            columns: ['entity_id']
            isOneToOne: false
            referencedRelation: 'entities'
            referencedColumns: ['id']
          },
        ]
      }
      evidence: {
        Row: {
          answer: Database['public']['Enums']['answer_value']
          attribute_id: string
          created_at: string
          entity_id: string
          evidence_weight: number
          game_id: string
          id: string
          question_id: string
        }
        Insert: {
          answer: Database['public']['Enums']['answer_value']
          attribute_id: string
          created_at?: string
          entity_id: string
          evidence_weight?: number
          game_id: string
          id?: string
          question_id: string
        }
        Update: {
          answer?: Database['public']['Enums']['answer_value']
          attribute_id?: string
          created_at?: string
          entity_id?: string
          evidence_weight?: number
          game_id?: string
          id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'evidence_attribute_id_fkey'
            columns: ['attribute_id']
            isOneToOne: false
            referencedRelation: 'attributes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'evidence_entity_id_fkey'
            columns: ['entity_id']
            isOneToOne: false
            referencedRelation: 'entities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'evidence_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'evidence_question_id_fkey'
            columns: ['question_id']
            isOneToOne: false
            referencedRelation: 'questions'
            referencedColumns: ['id']
          },
        ]
      }
      game_answers: {
        Row: {
          answer: Database['public']['Enums']['answer_value']
          answered_at: string
          game_id: string
          game_question_id: string
          id: string
        }
        Insert: {
          answer: Database['public']['Enums']['answer_value']
          answered_at?: string
          game_id: string
          game_question_id: string
          id?: string
        }
        Update: {
          answer?: Database['public']['Enums']['answer_value']
          answered_at?: string
          game_id?: string
          game_question_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'game_answers_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_answers_game_question_id_fkey'
            columns: ['game_question_id']
            isOneToOne: false
            referencedRelation: 'game_questions'
            referencedColumns: ['id']
          },
        ]
      }
      game_questions: {
        Row: {
          asked_at: string
          game_id: string
          id: string
          question_id: string
          question_number: number
        }
        Insert: {
          asked_at?: string
          game_id: string
          id?: string
          question_id: string
          question_number: number
        }
        Update: {
          asked_at?: string
          game_id?: string
          id?: string
          question_id?: string
          question_number?: number
        }
        Relationships: [
          {
            foreignKeyName: 'game_questions_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_questions_question_id_fkey'
            columns: ['question_id']
            isOneToOne: false
            referencedRelation: 'questions'
            referencedColumns: ['id']
          },
        ]
      }
      games: {
        Row: {
          category_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          guessed_entity_id: string | null
          id: string
          outcome: Database['public']['Enums']['game_outcome'] | null
          questions_asked: number
          started_at: string
          status: Database['public']['Enums']['game_status']
          target_entity_id: string | null
        }
        Insert: {
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          guessed_entity_id?: string | null
          id?: string
          outcome?: Database['public']['Enums']['game_outcome'] | null
          questions_asked?: number
          started_at?: string
          status?: Database['public']['Enums']['game_status']
          target_entity_id?: string | null
        }
        Update: {
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          guessed_entity_id?: string | null
          id?: string
          outcome?: Database['public']['Enums']['game_outcome'] | null
          questions_asked?: number
          started_at?: string
          status?: Database['public']['Enums']['game_status']
          target_entity_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'games_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'games_guessed_entity_id_fkey'
            columns: ['guessed_entity_id']
            isOneToOne: false
            referencedRelation: 'entities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'games_target_entity_id_fkey'
            columns: ['target_entity_id']
            isOneToOne: false
            referencedRelation: 'entities'
            referencedColumns: ['id']
          },
        ]
      }
      knowledge_history: {
        Row: {
          attribute_id: string
          confidence: number
          created_at: string
          entity_id: string
          evidence_count: number
          id: string
          negative_evidence: number
          positive_evidence: number
          source_evidence_id: string | null
          value_boolean: boolean | null
        }
        Insert: {
          attribute_id: string
          confidence: number
          created_at?: string
          entity_id: string
          evidence_count: number
          id?: string
          negative_evidence: number
          positive_evidence: number
          source_evidence_id?: string | null
          value_boolean?: boolean | null
        }
        Update: {
          attribute_id?: string
          confidence?: number
          created_at?: string
          entity_id?: string
          evidence_count?: number
          id?: string
          negative_evidence?: number
          positive_evidence?: number
          source_evidence_id?: string | null
          value_boolean?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: 'knowledge_history_attribute_id_fkey'
            columns: ['attribute_id']
            isOneToOne: false
            referencedRelation: 'attributes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'knowledge_history_entity_id_fkey'
            columns: ['entity_id']
            isOneToOne: false
            referencedRelation: 'entities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'knowledge_history_source_evidence_id_fkey'
            columns: ['source_evidence_id']
            isOneToOne: false
            referencedRelation: 'evidence'
            referencedColumns: ['id']
          },
        ]
      }
      question_families: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          active: boolean
          created_at: string
          id: string
          metadata: Json
          primary_attribute_id: string
          question_family_id: string | null
          text: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          metadata?: Json
          primary_attribute_id: string
          question_family_id?: string | null
          text: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          metadata?: Json
          primary_attribute_id?: string
          question_family_id?: string | null
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'questions_primary_attribute_id_fkey'
            columns: ['primary_attribute_id']
            isOneToOne: false
            referencedRelation: 'attributes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'questions_question_family_id_fkey'
            columns: ['question_family_id']
            isOneToOne: false
            referencedRelation: 'question_families'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_learning: { Args: { p_game_id: string }; Returns: number }
      finalize_game: {
        Args: {
          p_correct: boolean
          p_game_id: string
          p_guessed_entity_id: string
        }
        Returns: undefined
      }
      record_answer: {
        Args: {
          p_answer: Database['public']['Enums']['answer_value']
          p_game_id: string
          p_question_id: string
        }
        Returns: string
      }
      start_game: { Args: { p_category_id?: string }; Returns: string }
    }
    Enums: {
      answer_value: 'YES' | 'PROBABLY_YES' | 'UNKNOWN' | 'PROBABLY_NO' | 'NO'
      attribute_value_type:
        'BOOLEAN' | 'NUMERIC' | 'CATEGORICAL' | 'MULTI_VALUE'
      game_outcome:
        | 'CORRECT_GUESS'
        | 'WRONG_GUESS'
        | 'PLAYER_GAVE_UP'
        | 'QUESTION_LIMIT_REACHED'
      game_status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      answer_value: ['YES', 'PROBABLY_YES', 'UNKNOWN', 'PROBABLY_NO', 'NO'],
      attribute_value_type: [
        'BOOLEAN',
        'NUMERIC',
        'CATEGORICAL',
        'MULTI_VALUE',
      ],
      game_outcome: [
        'CORRECT_GUESS',
        'WRONG_GUESS',
        'PLAYER_GAVE_UP',
        'QUESTION_LIMIT_REACHED',
      ],
      game_status: ['IN_PROGRESS', 'COMPLETED', 'ABANDONED'],
    },
  },
} as const
