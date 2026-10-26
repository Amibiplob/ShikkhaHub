export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4";
  };
  public: {
    Tables: {
      tutor_profiles: {
        Row: {
          user_id: string;
          expertise: string;
          qualifications: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          expertise?: string;
          qualifications?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          expertise?: string;
          qualifications?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          target_id: string;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          target_id: string;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: string;
          target_id?: string;
          details?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      support_tickets: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          email: string;
          category: string;
          subject: string;
          message: string;
          status: string;
          created_at: string;
          updated_at: string;
          intake_nonce: string;
          payload_hash: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          email: string;
          category: string;
          subject: string;
          message: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
          intake_nonce: string;
          payload_hash: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          email?: string;
          category?: string;
          subject?: string;
          message?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
          intake_nonce?: string;
          payload_hash?: string;
        };
        Relationships: [];
      };
      support_notes: {
        Row: {
          id: string;
          ticket_id: string;
          author_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          author_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          author_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      lesson_bookmarks: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      tutoring_requests: {
        Row: {
          updated_at: string;
          decision_note: string | null;
          id: string;
          slot_id: string;
          student_id: string;
          message: string;
          status: string;
          meeting_url: string | null;
          created_at: string;
        };
        Insert: {
          updated_at?: string;
          decision_note?: string | null;
          id?: string;
          slot_id: string;
          student_id: string;
          message: string;
          status?: string;
          meeting_url?: string | null;
          created_at?: string;
        };
        Update: {
          updated_at?: string;
          decision_note?: string | null;
          id?: string;
          slot_id?: string;
          student_id?: string;
          message?: string;
          status?: string;
          meeting_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      tutor_slots: {
        Row: {
          is_reserved: boolean;
          timezone: string;
          cancelled_at: string | null;
          id: string;
          teacher_id: string;
          subject: string;
          starts_at: string;
          ends_at: string;
          created_at: string;
        };
        Insert: {
          is_reserved?: boolean;
          timezone?: string;
          cancelled_at?: string | null;
          id?: string;
          teacher_id: string;
          subject: string;
          starts_at: string;
          ends_at: string;
          created_at?: string;
        };
        Update: {
          is_reserved?: boolean;
          timezone?: string;
          cancelled_at?: string | null;
          id?: string;
          teacher_id?: string;
          subject?: string;
          starts_at?: string;
          ends_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      assignments: {
        Row: {
          course_id: string;
          created_at: string;
          description: string | null;
          due_date: string | null;
          id: string;
          max_marks: number | null;
          submission_types: string[] | null;
          teacher_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          max_marks?: number | null;
          submission_types?: string[] | null;
          teacher_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          max_marks?: number | null;
          submission_types?: string[] | null;
          teacher_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      badges: {
        Row: {
          created_at: string;
          criteria_type: string;
          criteria_value: number;
          description: string | null;
          icon: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          criteria_type: string;
          criteria_value?: number;
          description?: string | null;
          icon?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          criteria_type?: string;
          criteria_value?: number;
          description?: string | null;
          icon?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      certificates: {
        Row: {
          verification_token: string;
          student_name: string | null;
          course_title: string | null;
          validated_at: string | null;
          revoked_at: string | null;
          revocation_reason: string | null;
          certificate_number: string;
          course_id: string | null;
          id: string;
          issued_at: string;
          user_id: string;
        };
        Insert: {
          verification_token?: string;
          student_name?: string | null;
          course_title?: string | null;
          validated_at?: string | null;
          revoked_at?: string | null;
          revocation_reason?: string | null;
          certificate_number?: string;
          course_id: string | null;
          id?: string;
          issued_at?: string;
          user_id: string;
        };
        Update: {
          verification_token?: string;
          student_name?: string | null;
          course_title?: string | null;
          validated_at?: string | null;
          revoked_at?: string | null;
          revocation_reason?: string | null;
          certificate_number?: string;
          course_id?: string | null;
          id?: string;
          issued_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      class_recordings: {
        Row: {
          created_at: string;
          duration_seconds: number | null;
          file_size: number | null;
          file_url: string;
          id: string;
          live_class_id: string;
          teacher_id: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          duration_seconds?: number | null;
          file_size?: number | null;
          file_url: string;
          id?: string;
          live_class_id: string;
          teacher_id: string;
          title: string;
        };
        Update: {
          created_at?: string;
          duration_seconds?: number | null;
          file_size?: number | null;
          file_url?: string;
          id?: string;
          live_class_id?: string;
          teacher_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_recordings_live_class_id_fkey";
            columns: ["live_class_id"];
            isOneToOne: false;
            referencedRelation: "live_classes";
            referencedColumns: ["id"];
          },
        ];
      };
      community_comments: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          parent_id: string | null;
          post_id: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          parent_id?: string | null;
          post_id: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          parent_id?: string | null;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "community_comments_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "community_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_comments_user_id_profiles_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      community_posts: {
        Row: {
          category: string;
          content: string;
          created_at: string;
          id: string;
          is_pinned: boolean | null;
          is_reported: boolean | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category: string;
          content: string;
          created_at?: string;
          id?: string;
          is_pinned?: boolean | null;
          is_reported?: boolean | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          content?: string;
          created_at?: string;
          id?: string;
          is_pinned?: boolean | null;
          is_reported?: boolean | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "community_posts_user_id_profiles_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      community_upvotes: {
        Row: {
          comment_id: string | null;
          created_at: string;
          id: string;
          post_id: string | null;
          user_id: string;
        };
        Insert: {
          comment_id?: string | null;
          created_at?: string;
          id?: string;
          post_id?: string | null;
          user_id: string;
        };
        Update: {
          comment_id?: string | null;
          created_at?: string;
          id?: string;
          post_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "community_upvotes_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "community_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_upvotes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      course_bookmarks: {
        Row: {
          course_id: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_bookmarks_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      course_discussions: {
        Row: {
          content: string;
          course_id: string;
          created_at: string;
          id: string;
          parent_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content: string;
          course_id: string;
          created_at?: string;
          id?: string;
          parent_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          content?: string;
          course_id?: string;
          created_at?: string;
          id?: string;
          parent_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_discussions_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_discussions_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "course_discussions";
            referencedColumns: ["id"];
          },
        ];
      };
      course_prerequisites: {
        Row: {
          course_id: string;
          created_at: string;
          id: string;
          prerequisite_course_id: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          id?: string;
          prerequisite_course_id: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          id?: string;
          prerequisite_course_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_prerequisites_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_prerequisites_prerequisite_course_id_fkey";
            columns: ["prerequisite_course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      course_reviews: {
        Row: {
          comment: string | null;
          course_id: string;
          created_at: string;
          id: string;
          rating: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          comment?: string | null;
          course_id: string;
          created_at?: string;
          id?: string;
          rating: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          comment?: string | null;
          course_id?: string;
          created_at?: string;
          id?: string;
          rating?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "course_reviews_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          review_status: string;
          price_bdt: number;
          category: string | null;
          created_at: string;
          description: string | null;
          difficulty: string | null;
          id: string;
          is_published: boolean | null;
          teacher_id: string;
          thumbnail_url: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          review_status?: string;
          price_bdt?: number;
          category?: string | null;
          created_at?: string;
          description?: string | null;
          difficulty?: string | null;
          id?: string;
          is_published?: boolean | null;
          teacher_id: string;
          thumbnail_url?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          review_status?: string;
          price_bdt?: number;
          category?: string | null;
          created_at?: string;
          description?: string | null;
          difficulty?: string | null;
          id?: string;
          is_published?: boolean | null;
          teacher_id?: string;
          thumbnail_url?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_teacher_id_profiles_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      enrollments: {
        Row: {
          course_id: string;
          enrolled_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          course_id: string;
          enrolled_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          course_id?: string;
          enrolled_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_progress: {
        Row: {
          completed: boolean | null;
          completed_at: string | null;
          id: string;
          lesson_id: string;
          user_id: string;
        };
        Insert: {
          completed?: boolean | null;
          completed_at?: string | null;
          id?: string;
          lesson_id: string;
          user_id: string;
        };
        Update: {
          completed?: boolean | null;
          completed_at?: string | null;
          id?: string;
          lesson_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          content: string | null;
          created_at: string;
          duration_minutes: number | null;
          file_url: string | null;
          id: string;
          module_id: string;
          sort_order: number;
          title: string;
          type: string;
          updated_at: string;
          video_url: string | null;
        };
        Insert: {
          content?: string | null;
          created_at?: string;
          duration_minutes?: number | null;
          file_url?: string | null;
          id?: string;
          module_id: string;
          sort_order?: number;
          title: string;
          type: string;
          updated_at?: string;
          video_url?: string | null;
        };
        Update: {
          content?: string | null;
          created_at?: string;
          duration_minutes?: number | null;
          file_url?: string | null;
          id?: string;
          module_id?: string;
          sort_order?: number;
          title?: string;
          type?: string;
          updated_at?: string;
          video_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      live_classes: {
        Row: {
          course_id: string;
          created_at: string;
          description: string | null;
          duration_minutes: number | null;
          id: string;
          room_name: string;
          scheduled_at: string;
          status: string;
          teacher_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number | null;
          id?: string;
          room_name: string;
          scheduled_at: string;
          status?: string;
          teacher_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number | null;
          id?: string;
          room_name?: string;
          scheduled_at?: string;
          status?: string;
          teacher_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "live_classes_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      modules: {
        Row: {
          course_id: string;
          created_at: string;
          description: string | null;
          id: string;
          sort_order: number;
          title: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          sort_order?: number;
          title: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          sort_order?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          is_read: boolean;
          link: string | null;
          message: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          message?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          message?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      quiz_attempts: {
        Row: {
          answers: Json;
          completed_at: string;
          id: string;
          passed: boolean;
          quiz_id: string;
          score: number;
          total_points: number;
          user_id: string;
        };
        Insert: {
          answers?: Json;
          completed_at?: string;
          id?: string;
          passed?: boolean;
          quiz_id: string;
          score?: number;
          total_points?: number;
          user_id: string;
        };
        Update: {
          answers?: Json;
          completed_at?: string;
          id?: string;
          passed?: boolean;
          quiz_id?: string;
          score?: number;
          total_points?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_questions: {
        Row: {
          correct_answer: number;
          id: string;
          options: Json;
          points: number;
          question: string;
          quiz_id: string;
          sort_order: number;
        };
        Insert: {
          correct_answer?: number;
          id?: string;
          options?: Json;
          points?: number;
          question: string;
          quiz_id: string;
          sort_order?: number;
        };
        Update: {
          correct_answer?: number;
          id?: string;
          options?: Json;
          points?: number;
          question?: string;
          quiz_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
        ];
      };
      quizzes: {
        Row: {
          course_id: string;
          created_at: string;
          description: string | null;
          id: string;
          module_id: string | null;
          pass_percentage: number;
          time_limit_minutes: number | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          module_id?: string | null;
          pass_percentage?: number;
          time_limit_minutes?: number | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          module_id?: string | null;
          pass_percentage?: number;
          time_limit_minutes?: number | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quizzes_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      submissions: {
        Row: {
          assignment_id: string;
          content: string;
          feedback: string | null;
          file_url: string | null;
          id: string;
          marks: number | null;
          reviewed_at: string | null;
          status: string;
          student_id: string;
          submission_type: string;
          submitted_at: string;
          updated_at: string;
        };
        Insert: {
          assignment_id: string;
          content: string;
          feedback?: string | null;
          file_url?: string | null;
          id?: string;
          marks?: number | null;
          reviewed_at?: string | null;
          status?: string;
          student_id: string;
          submission_type: string;
          submitted_at?: string;
          updated_at?: string;
        };
        Update: {
          assignment_id?: string;
          content?: string;
          feedback?: string | null;
          file_url?: string | null;
          id?: string;
          marks?: number | null;
          reviewed_at?: string | null;
          status?: string;
          student_id?: string;
          submission_type?: string;
          submitted_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "submissions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "submissions_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      teacher_requests: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          badge_id: string;
          earned_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          badge_id: string;
          earned_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          badge_id?: string;
          earned_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_content_action: {
        Args: {
          target_id: string;
          content_kind: string;
          action: string;
          reason: string;
        };
        Returns: undefined;
      };
      admin_set_role: {
        Args: {
          target_user: string;
          target_role: "admin" | "teacher" | "student";
          grant_role: boolean;
          reason: string;
        };
        Returns: undefined;
      };
      admin_course_action: {
        Args: { target_course: string; action: string; reason: string };
        Returns: undefined;
      };
      request_course_review: {
        Args: { target_course: string };
        Returns: undefined;
      };
      save_tutor_slot: {
        Args: {
          slot_id: string | null;
          subject: string;
          starts: string;
          duration_minutes: number;
          zone: string;
          repeat_weeks?: number;
        };
        Returns: Database["public"]["Tables"]["tutor_slots"]["Row"][];
      };
      cancel_tutor_slot: { Args: { target_slot: string }; Returns: undefined };
      request_tutoring: {
        Args: { target_slot: string; message: string };
        Returns: Database["public"]["Tables"]["tutoring_requests"]["Row"];
      };
      decide_tutoring: {
        Args: {
          request_id: string;
          action: string;
          meeting_link?: string | null;
          note?: string | null;
        };
        Returns: Database["public"]["Tables"]["tutoring_requests"]["Row"];
      };
      issue_course_certificate: {
        Args: { target_course: string };
        Returns: Database["public"]["Tables"]["certificates"]["Row"];
      };
      certificate_download_record: {
        Args: { certificate_id: string };
        Returns: Database["public"]["Tables"]["certificates"]["Row"];
      };
      verify_certificate: { Args: { token: string }; Returns: Json };
      admin_revoke_certificate: {
        Args: { certificate_id: string; reason: string };
        Returns: undefined;
      };
      admin_support_action: {
        Args: {
          ticket_id: string;
          next_status: string;
          internal_note?: string | null;
        };
        Returns: undefined;
      };
      admin_overview: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_records: {
        Args: {
          kind: string;
          search?: string;
          state?: string;
          page_offset?: number;
          page_size?: number;
        };
        Returns: Json;
      };
      get_leaderboard: {
        Args: Record<PropertyKey, never>;
        Returns: {
          user_id: string;
          full_name: string;
          completedCourses: number;
          certificates: number;
          lessonsCompleted: number;
        }[];
      };
      send_live_signal: {
        Args: { room: string; signal_event: string; signal_payload: Json };
        Returns: undefined;
      };
      read_quiz_questions: { Args: { target_quiz: string }; Returns: Json };
      submit_quiz: {
        Args: { target_quiz: string; submitted_answers: Json };
        Returns: Database["public"]["Tables"]["quiz_attempts"]["Row"];
      };
      review_teacher_request: {
        Args: { request_id: string; approve: boolean };
        Returns: undefined;
      };

      expire_old_live_classes: { Args: never; Returns: undefined };
      get_platform_stats: { Args: never; Returns: Json };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "teacher" | "student";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "teacher", "student"],
    },
  },
} as const;
