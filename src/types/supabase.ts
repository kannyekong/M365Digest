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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      academy_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      academy_certificate_templates: {
        Row: {
          background_image_url: string | null
          configuration: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          logo_url: string | null
          name: string
          orientation: string
          primary_color: string | null
          secondary_color: string | null
          signatory_name: string | null
          signatory_title: string | null
          signature_image_url: string | null
          template_key: string
          text_color: string | null
          updated_at: string
        }
        Insert: {
          background_image_url?: string | null
          configuration?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          logo_url?: string | null
          name: string
          orientation?: string
          primary_color?: string | null
          secondary_color?: string | null
          signatory_name?: string | null
          signatory_title?: string | null
          signature_image_url?: string | null
          template_key: string
          text_color?: string | null
          updated_at?: string
        }
        Update: {
          background_image_url?: string | null
          configuration?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          logo_url?: string | null
          name?: string
          orientation?: string
          primary_color?: string | null
          secondary_color?: string | null
          signatory_name?: string | null
          signatory_title?: string | null
          signature_image_url?: string | null
          template_key?: string
          text_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      academy_certificates: {
        Row: {
          certificate_number: string
          completion_date: string | null
          created_at: string
          file_url: string | null
          generated_at: string
          generated_by: string | null
          id: string
          issue_date: string
          metadata: Json
          program_id: string
          program_title: string
          recipient_name: string
          registration_id: string
          revocation_reason: string | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["academy_certificate_status"]
          template_id: string | null
          updated_at: string
          verification_code: string
        }
        Insert: {
          certificate_number: string
          completion_date?: string | null
          created_at?: string
          file_url?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          issue_date?: string
          metadata?: Json
          program_id: string
          program_title: string
          recipient_name: string
          registration_id: string
          revocation_reason?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["academy_certificate_status"]
          template_id?: string | null
          updated_at?: string
          verification_code: string
        }
        Update: {
          certificate_number?: string
          completion_date?: string | null
          created_at?: string
          file_url?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          issue_date?: string
          metadata?: Json
          program_id?: string
          program_title?: string
          recipient_name?: string
          registration_id?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["academy_certificate_status"]
          template_id?: string | null
          updated_at?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_certificates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "academy_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_certificates_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "academy_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_certificates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "academy_certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_instructors: {
        Row: {
          bio: string | null
          created_at: string | null
          display_order: number | null
          email: string | null
          full_name: string
          github_url: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          linkedin_url: string | null
          phone: string | null
          skills: string[] | null
          title: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          display_order?: number | null
          email?: string | null
          full_name: string
          github_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          linkedin_url?: string | null
          phone?: string | null
          skills?: string[] | null
          title?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          display_order?: number | null
          email?: string | null
          full_name?: string
          github_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          linkedin_url?: string | null
          phone?: string | null
          skills?: string[] | null
          title?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      academy_program_instructors: {
        Row: {
          created_at: string
          display_order: number
          id: string
          instructor_id: string
          is_lead: boolean
          program_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          instructor_id: string
          is_lead?: boolean
          program_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          instructor_id?: string
          is_lead?: boolean
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_program_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "academy_instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_program_instructors_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "academy_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_program_lessons: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          duration: string | null
          id: string
          lesson_type: string
          module_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          duration?: string | null
          id?: string
          lesson_type?: string
          module_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          duration?: string | null
          id?: string
          lesson_type?: string
          module_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_program_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "academy_program_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_program_modules: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          duration: string | null
          id: string
          is_preview: boolean
          module_number: number
          program_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          duration?: string | null
          id?: string
          is_preview?: boolean
          module_number?: number
          program_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          duration?: string | null
          id?: string
          is_preview?: boolean
          module_number?: number
          program_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_program_modules_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "academy_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_programs: {
        Row: {
          banner_image_url: string | null
          category_id: string | null
          certificate_enabled: boolean
          certificate_template_id: string | null
          code: string | null
          created_at: string
          currency: string
          delivery_mode: Database["public"]["Enums"]["academy_delivery_mode"]
          description: string | null
          discount_price: number | null
          display_order: number
          duration_unit: string | null
          duration_value: number | null
          end_date: string | null
          featured: boolean
          hero_image_url: string | null
          id: string
          learning_outcomes: Json
          location: string | null
          maximum_students: number | null
          prerequisites: Json
          price: number
          published_at: string | null
          registration_deadline: string | null
          registration_open: boolean
          seo_description: string | null
          seo_title: string | null
          session_schedule: string | null
          short_description: string | null
          show_price: boolean
          slug: string
          start_date: string | null
          status: Database["public"]["Enums"]["academy_program_status"]
          target_audience: Json
          thumbnail_image_url: string | null
          title: string
          tools_covered: Json
          updated_at: string
        }
        Insert: {
          banner_image_url?: string | null
          category_id?: string | null
          certificate_enabled?: boolean
          certificate_template_id?: string | null
          code?: string | null
          created_at?: string
          currency?: string
          delivery_mode?: Database["public"]["Enums"]["academy_delivery_mode"]
          description?: string | null
          discount_price?: number | null
          display_order?: number
          duration_unit?: string | null
          duration_value?: number | null
          end_date?: string | null
          featured?: boolean
          hero_image_url?: string | null
          id?: string
          learning_outcomes?: Json
          location?: string | null
          maximum_students?: number | null
          prerequisites?: Json
          price?: number
          published_at?: string | null
          registration_deadline?: string | null
          registration_open?: boolean
          seo_description?: string | null
          seo_title?: string | null
          session_schedule?: string | null
          short_description?: string | null
          show_price?: boolean
          slug: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["academy_program_status"]
          target_audience?: Json
          thumbnail_image_url?: string | null
          title: string
          tools_covered?: Json
          updated_at?: string
        }
        Update: {
          banner_image_url?: string | null
          category_id?: string | null
          certificate_enabled?: boolean
          certificate_template_id?: string | null
          code?: string | null
          created_at?: string
          currency?: string
          delivery_mode?: Database["public"]["Enums"]["academy_delivery_mode"]
          description?: string | null
          discount_price?: number | null
          display_order?: number
          duration_unit?: string | null
          duration_value?: number | null
          end_date?: string | null
          featured?: boolean
          hero_image_url?: string | null
          id?: string
          learning_outcomes?: Json
          location?: string | null
          maximum_students?: number | null
          prerequisites?: Json
          price?: number
          published_at?: string | null
          registration_deadline?: string | null
          registration_open?: boolean
          seo_description?: string | null
          seo_title?: string | null
          session_schedule?: string | null
          short_description?: string | null
          show_price?: boolean
          slug?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["academy_program_status"]
          target_audience?: Json
          thumbnail_image_url?: string | null
          title?: string
          tools_covered?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_programs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "academy_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_programs_certificate_template_id_fkey"
            columns: ["certificate_template_id"]
            isOneToOne: false
            referencedRelation: "academy_certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_registrations: {
        Row: {
          amount_expected: number | null
          amount_paid: number | null
          availability: string | null
          certificate_status: Database["public"]["Enums"]["academy_certificate_status"]
          city: string | null
          company: string | null
          completed_at: string | null
          country: string | null
          created_at: string
          currency: string
          email: string
          experience_level: string | null
          external_submission_id: string | null
          first_name: string
          id: string
          job_title: string | null
          last_name: string
          learning_goal: string | null
          metadata: Json
          paid_at: string | null
          payment_provider: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["academy_payment_status"]
          phone: string | null
          program_id: string
          referral_source: string | null
          registration_status: Database["public"]["Enums"]["academy_registration_status"]
          source: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          amount_expected?: number | null
          amount_paid?: number | null
          availability?: string | null
          certificate_status?: Database["public"]["Enums"]["academy_certificate_status"]
          city?: string | null
          company?: string | null
          completed_at?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          email: string
          experience_level?: string | null
          external_submission_id?: string | null
          first_name: string
          id?: string
          job_title?: string | null
          last_name: string
          learning_goal?: string | null
          metadata?: Json
          paid_at?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["academy_payment_status"]
          phone?: string | null
          program_id: string
          referral_source?: string | null
          registration_status?: Database["public"]["Enums"]["academy_registration_status"]
          source?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          amount_expected?: number | null
          amount_paid?: number | null
          availability?: string | null
          certificate_status?: Database["public"]["Enums"]["academy_certificate_status"]
          city?: string | null
          company?: string | null
          completed_at?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          email?: string
          experience_level?: string | null
          external_submission_id?: string | null
          first_name?: string
          id?: string
          job_title?: string | null
          last_name?: string
          learning_goal?: string | null
          metadata?: Json
          paid_at?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["academy_payment_status"]
          phone?: string | null
          program_id?: string
          referral_source?: string | null
          registration_status?: Database["public"]["Enums"]["academy_registration_status"]
          source?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_registrations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "academy_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author: string | null
          canonical_url: string | null
          category: string | null
          category_id: string | null
          content: Json
          cover_image: string | null
          created_at: string | null
          excerpt: string | null
          featured: boolean | null
          featured_image: string | null
          featured_image_alt: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published: boolean | null
          published_at: string | null
          reading_time: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string | null
          views: number | null
        }
        Insert: {
          author?: string | null
          canonical_url?: string | null
          category?: string | null
          category_id?: string | null
          content: Json
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured?: boolean | null
          featured_image?: string | null
          featured_image_alt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean | null
          published_at?: string | null
          reading_time?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          author?: string | null
          canonical_url?: string | null
          category?: string | null
          category_id?: string | null
          content?: Json
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured?: boolean | null
          featured_image?: string | null
          featured_image_alt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean | null
          published_at?: string | null
          reading_time?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      bootcamp_registrations: {
        Row: {
          availability: string | null
          company: string | null
          country: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          job_title: string | null
          last_name: string | null
          payload: Json | null
          payment_confirmed_at: string | null
          payment_reference: string | null
          payment_status: string | null
          phone_number: string | null
          tally_submission_id: string | null
          timezone: string | null
        }
        Insert: {
          availability?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          payload?: Json | null
          payment_confirmed_at?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          phone_number?: string | null
          tally_submission_id?: string | null
          timezone?: string | null
        }
        Update: {
          availability?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          payload?: Json | null
          payment_confirmed_at?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          phone_number?: string | null
          tally_submission_id?: string | null
          timezone?: string | null
        }
        Relationships: []
      }
      bootcamp_settings: {
        Row: {
          canonical_url: string | null
          class_schedule: string | null
          cta_text: string | null
          cta_url: string | null
          delivery_mode: string | null
          discount_price: number | null
          duration: string | null
          hero_image: string | null
          hero_prefix: string | null
          hero_rotating_words: Json | null
          hero_subtitle: string | null
          hero_suffix: string | null
          id: string
          next_cohort: string | null
          price: number | null
          registration_deadline: string | null
          registration_open: boolean | null
          seats_remaining: number | null
          seo_description: string | null
          seo_title: string | null
          updated_at: string | null
        }
        Insert: {
          canonical_url?: string | null
          class_schedule?: string | null
          cta_text?: string | null
          cta_url?: string | null
          delivery_mode?: string | null
          discount_price?: number | null
          duration?: string | null
          hero_image?: string | null
          hero_prefix?: string | null
          hero_rotating_words?: Json | null
          hero_subtitle?: string | null
          hero_suffix?: string | null
          id?: string
          next_cohort?: string | null
          price?: number | null
          registration_deadline?: string | null
          registration_open?: boolean | null
          seats_remaining?: number | null
          seo_description?: string | null
          seo_title?: string | null
          updated_at?: string | null
        }
        Update: {
          canonical_url?: string | null
          class_schedule?: string | null
          cta_text?: string | null
          cta_url?: string | null
          delivery_mode?: string | null
          discount_price?: number | null
          duration?: string | null
          hero_image?: string | null
          hero_prefix?: string | null
          hero_rotating_words?: Json | null
          hero_subtitle?: string | null
          hero_suffix?: string | null
          id?: string
          next_cohort?: string | null
          price?: number | null
          registration_deadline?: string | null
          registration_open?: boolean | null
          seats_remaining?: number | null
          seo_description?: string | null
          seo_title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_name: string
          certificate_number: string
          certificate_url: string | null
          course_name: string
          created_at: string
          id: string
          issued_at: string
          registration_id: string
          verification_token: string
        }
        Insert: {
          certificate_name: string
          certificate_number: string
          certificate_url?: string | null
          course_name?: string
          created_at?: string
          id?: string
          issued_at?: string
          registration_id: string
          verification_token?: string
        }
        Update: {
          certificate_name?: string
          certificate_number?: string
          certificate_url?: string | null
          course_name?: string
          created_at?: string
          id?: string
          issued_at?: string
          registration_id?: string
          verification_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "bootcamp_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          alternative_phone: string | null
          archived_at: string | null
          client_id: string
          contact_type: string
          created_at: string
          created_by: string | null
          department: string | null
          email: string | null
          first_name: string
          id: string
          is_primary: boolean
          job_title: string | null
          last_name: string | null
          metadata: Json
          notes: string | null
          phone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          alternative_phone?: string | null
          archived_at?: string | null
          client_id: string
          contact_type?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_primary?: boolean
          job_title?: string | null
          last_name?: string | null
          metadata?: Json
          notes?: string | null
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          alternative_phone?: string | null
          archived_at?: string | null
          client_id?: string
          contact_type?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_primary?: boolean
          job_title?: string | null
          last_name?: string | null
          metadata?: Json
          notes?: string | null
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          archived_at: string | null
          client_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_pinned: boolean
          note_type: string
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          client_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          note_type?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          client_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          note_type?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          account_manager_id: string | null
          alternative_phone: string | null
          archived_at: string | null
          billing_address: string | null
          city: string | null
          client_code: string
          client_type: string
          company_name: string | null
          country: string
          created_at: string
          created_by: string | null
          display_name: string
          email: string | null
          first_name: string | null
          id: string
          industry: string | null
          last_name: string | null
          metadata: Json
          notes: string | null
          phone: string | null
          postal_code: string | null
          source: string | null
          state: string | null
          status: string
          tax_identification_number: string | null
          updated_at: string
          updated_by: string | null
          website: string | null
        }
        Insert: {
          account_manager_id?: string | null
          alternative_phone?: string | null
          archived_at?: string | null
          billing_address?: string | null
          city?: string | null
          client_code: string
          client_type?: string
          company_name?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          display_name: string
          email?: string | null
          first_name?: string | null
          id?: string
          industry?: string | null
          last_name?: string | null
          metadata?: Json
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          source?: string | null
          state?: string | null
          status?: string
          tax_identification_number?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          account_manager_id?: string | null
          alternative_phone?: string | null
          archived_at?: string | null
          billing_address?: string | null
          city?: string | null
          client_code?: string
          client_type?: string
          company_name?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          display_name?: string
          email?: string | null
          first_name?: string | null
          id?: string
          industry?: string | null
          last_name?: string | null
          metadata?: Json
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          source?: string | null
          state?: string | null
          status?: string
          tax_identification_number?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_account_manager_id_fkey"
            columns: ["account_manager_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          is_read: boolean
          last_name: string | null
          payload: Json | null
          phone_number: string | null
          question: string | null
          tally_submission_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_read?: boolean
          last_name?: string | null
          payload?: Json | null
          phone_number?: string | null
          question?: string | null
          tally_submission_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_read?: boolean
          last_name?: string | null
          payload?: Json | null
          phone_number?: string | null
          question?: string | null
          tally_submission_id?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_budget_allocations: {
        Row: {
          allocated_amount: number
          budget_id: string
          created_at: string
          id: string
          notes: string | null
          transaction_category: string
          updated_at: string
        }
        Insert: {
          allocated_amount: number
          budget_id: string
          created_at?: string
          id?: string
          notes?: string | null
          transaction_category: string
          updated_at?: string
        }
        Update: {
          allocated_amount?: number
          budget_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          transaction_category?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_budget_allocations_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "finance_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_budgets: {
        Row: {
          archived_at: string | null
          budget_type: string
          created_at: string
          created_by: string | null
          currency: string
          department: string | null
          description: string | null
          end_date: string
          id: string
          name: string
          project_code: string | null
          start_date: string
          status: string
          total_amount: number
          updated_at: string
          updated_by: string | null
          warning_threshold: number
        }
        Insert: {
          archived_at?: string | null
          budget_type?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          department?: string | null
          description?: string | null
          end_date: string
          id?: string
          name: string
          project_code?: string | null
          start_date: string
          status?: string
          total_amount: number
          updated_at?: string
          updated_by?: string | null
          warning_threshold?: number
        }
        Update: {
          archived_at?: string | null
          budget_type?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          department?: string | null
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          project_code?: string | null
          start_date?: string
          status?: string
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          warning_threshold?: number
        }
        Relationships: []
      }
      finance_reconciliation_history: {
        Row: {
          action: string
          amount_difference: number | null
          dispute_reason: string | null
          evidence_url: string | null
          external_amount: number | null
          external_reference: string | null
          id: string
          internal_amount: number
          internal_reference: string | null
          metadata: Json
          new_status: string
          notes: string | null
          performed_at: string
          performed_by: string | null
          previous_status: string | null
          provider: string | null
          settlement_date: string | null
          transaction_id: string
        }
        Insert: {
          action: string
          amount_difference?: number | null
          dispute_reason?: string | null
          evidence_url?: string | null
          external_amount?: number | null
          external_reference?: string | null
          id?: string
          internal_amount: number
          internal_reference?: string | null
          metadata?: Json
          new_status: string
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          previous_status?: string | null
          provider?: string | null
          settlement_date?: string | null
          transaction_id: string
        }
        Update: {
          action?: string
          amount_difference?: number | null
          dispute_reason?: string | null
          evidence_url?: string | null
          external_amount?: number | null
          external_reference?: string | null
          id?: string
          internal_amount?: number
          internal_reference?: string | null
          metadata?: Json
          new_status?: string
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          previous_status?: string | null
          provider?: string | null
          settlement_date?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_reconciliation_history_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_reconciliation_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_reconciliation_history_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_refundable_transactions"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "finance_reconciliation_history_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_refunds: {
        Row: {
          approved_amount: number | null
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          cancelled_at: string | null
          created_at: string
          currency: string
          failed_at: string | null
          id: string
          internal_notes: string | null
          invoice_id: string | null
          metadata: Json
          original_transaction_id: string
          payment_method: string | null
          processed_at: string | null
          processed_by: string | null
          provider: string
          provider_payload: Json
          provider_refund_reference: string | null
          reason: string
          receipt_id: string | null
          refund_reference: string
          refunded_amount: number
          rejected_at: string | null
          rejected_by: string | null
          requested_amount: number
          requested_at: string
          requested_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          failed_at?: string | null
          id?: string
          internal_notes?: string | null
          invoice_id?: string | null
          metadata?: Json
          original_transaction_id: string
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          provider?: string
          provider_payload?: Json
          provider_refund_reference?: string | null
          reason: string
          receipt_id?: string | null
          refund_reference: string
          refunded_amount?: number
          rejected_at?: string | null
          rejected_by?: string | null
          requested_amount: number
          requested_at?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          failed_at?: string | null
          id?: string
          internal_notes?: string | null
          invoice_id?: string | null
          metadata?: Json
          original_transaction_id?: string
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          provider?: string
          provider_payload?: Json
          provider_refund_reference?: string | null
          reason?: string
          receipt_id?: string | null
          refund_reference?: string
          refunded_amount?: number
          rejected_at?: string | null
          rejected_by?: string | null
          requested_amount?: number
          requested_at?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_refunds_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_refunds_original_transaction_id_fkey"
            columns: ["original_transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_reconciliation_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_refunds_original_transaction_id_fkey"
            columns: ["original_transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_refundable_transactions"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "finance_refunds_original_transaction_id_fkey"
            columns: ["original_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_refunds_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          archived_at: string | null
          bank_account: string | null
          base_amount: number | null
          base_currency: string
          client_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          description: string
          dispute_reason: string | null
          exchange_rate: number
          external_amount: number | null
          fee_amount: number
          id: string
          internal_notes: string | null
          internal_reference: string
          invoice_number: string | null
          metadata: Json
          paid_at: string | null
          payment_method: string | null
          provider: string
          provider_payload: Json
          provider_reference: string | null
          receipt_number: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_notes: string | null
          reconciliation_reference: string | null
          reconciliation_status: string
          refunded_amount: number
          settlement_date: string | null
          source_id: string | null
          source_table: string | null
          status: string
          tax_amount: number
          transaction_category: string
          transaction_date: string
          transaction_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          archived_at?: string | null
          bank_account?: string | null
          base_amount?: number | null
          base_currency?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description: string
          dispute_reason?: string | null
          exchange_rate?: number
          external_amount?: number | null
          fee_amount?: number
          id?: string
          internal_notes?: string | null
          internal_reference: string
          invoice_number?: string | null
          metadata?: Json
          paid_at?: string | null
          payment_method?: string | null
          provider: string
          provider_payload?: Json
          provider_reference?: string | null
          receipt_number?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_notes?: string | null
          reconciliation_reference?: string | null
          reconciliation_status?: string
          refunded_amount?: number
          settlement_date?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
          tax_amount?: number
          transaction_category: string
          transaction_date?: string
          transaction_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          archived_at?: string | null
          bank_account?: string | null
          base_amount?: number | null
          base_currency?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description?: string
          dispute_reason?: string | null
          exchange_rate?: number
          external_amount?: number | null
          fee_amount?: number
          id?: string
          internal_notes?: string | null
          internal_reference?: string
          invoice_number?: string | null
          metadata?: Json
          paid_at?: string | null
          payment_method?: string | null
          provider?: string
          provider_payload?: Json
          provider_reference?: string | null
          receipt_number?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_notes?: string | null
          reconciliation_reference?: string | null
          reconciliation_status?: string
          refunded_amount?: number
          settlement_date?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
          tax_amount?: number
          transaction_category?: string
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          discount_amount: number
          discount_type: Database["public"]["Enums"]["invoice_discount_type"]
          discount_value: number
          id: string
          invoice_id: string
          line_subtotal: number
          line_total: number
          quantity: number
          sort_order: number
          tax_amount: number
          tax_rate: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          discount_amount?: number
          discount_type?: Database["public"]["Enums"]["invoice_discount_type"]
          discount_value?: number
          id?: string
          invoice_id: string
          line_subtotal?: number
          line_total?: number
          quantity?: number
          sort_order?: number
          tax_amount?: number
          tax_rate?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          discount_amount?: number
          discount_type?: Database["public"]["Enums"]["invoice_discount_type"]
          discount_value?: number
          id?: string
          invoice_id?: string
          line_subtotal?: number
          line_total?: number
          quantity?: number
          sort_order?: number
          tax_amount?: number
          tax_rate?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payment_attempts: {
        Row: {
          access_code: string | null
          amount: number
          authorization_url: string | null
          channel: string | null
          created_at: string
          currency: string
          customer_email: string
          gateway_response: string | null
          id: string
          invoice_id: string
          metadata: Json
          paid_at: string | null
          paystack_transaction_id: number | null
          raw_response: Json | null
          receipt_id: string | null
          reference: string
          revenue_transaction_id: string | null
          status: Database["public"]["Enums"]["invoice_payment_attempt_status"]
          updated_at: string
        }
        Insert: {
          access_code?: string | null
          amount: number
          authorization_url?: string | null
          channel?: string | null
          created_at?: string
          currency?: string
          customer_email: string
          gateway_response?: string | null
          id?: string
          invoice_id: string
          metadata?: Json
          paid_at?: string | null
          paystack_transaction_id?: number | null
          raw_response?: Json | null
          receipt_id?: string | null
          reference: string
          revenue_transaction_id?: string | null
          status?: Database["public"]["Enums"]["invoice_payment_attempt_status"]
          updated_at?: string
        }
        Update: {
          access_code?: string | null
          amount?: number
          authorization_url?: string | null
          channel?: string | null
          created_at?: string
          currency?: string
          customer_email?: string
          gateway_response?: string | null
          id?: string
          invoice_id?: string
          metadata?: Json
          paid_at?: string | null
          paystack_transaction_id?: number | null
          raw_response?: Json | null
          receipt_id?: string | null
          reference?: string
          revenue_transaction_id?: string | null
          status?: Database["public"]["Enums"]["invoice_payment_attempt_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payment_attempts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payment_attempts_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payment_attempts_revenue_transaction_id_fkey"
            columns: ["revenue_transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_reconciliation_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payment_attempts_revenue_transaction_id_fkey"
            columns: ["revenue_transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_refundable_transactions"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "invoice_payment_attempts_revenue_transaction_id_fkey"
            columns: ["revenue_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          archived_at: string | null
          billing_address: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_company: string | null
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          delivery_status: Database["public"]["Enums"]["invoice_delivery_status"]
          discount_amount: number
          discount_type: Database["public"]["Enums"]["invoice_discount_type"]
          discount_value: number
          due_date: string
          id: string
          internal_notes: string | null
          invoice_number: string
          issue_date: string
          notes: string | null
          paid_at: string | null
          payment_reference: string | null
          project_id: string | null
          purchase_order_number: string | null
          revenue_transaction_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal_amount: number
          tax_amount: number
          terms: string | null
          total_amount: number
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          archived_at?: string | null
          billing_address?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_company?: string | null
          customer_email: string
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          delivery_status?: Database["public"]["Enums"]["invoice_delivery_status"]
          discount_amount?: number
          discount_type?: Database["public"]["Enums"]["invoice_discount_type"]
          discount_value?: number
          due_date: string
          id?: string
          internal_notes?: string | null
          invoice_number: string
          issue_date?: string
          notes?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          project_id?: string | null
          purchase_order_number?: string | null
          revenue_transaction_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal_amount?: number
          tax_amount?: number
          terms?: string | null
          total_amount?: number
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          archived_at?: string | null
          billing_address?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_company?: string | null
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivery_status?: Database["public"]["Enums"]["invoice_delivery_status"]
          discount_amount?: number
          discount_type?: Database["public"]["Enums"]["invoice_discount_type"]
          discount_value?: number
          due_date?: string
          id?: string
          internal_notes?: string | null
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          project_id?: string | null
          purchase_order_number?: string | null
          revenue_transaction_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal_amount?: number
          tax_amount?: number
          terms?: string | null
          total_amount?: number
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          cover_letter: string | null
          created_at: string
          current_company: string | null
          current_job_title: string | null
          email: string
          full_name: string
          id: string
          interest_reason: string | null
          internal_notes: string | null
          job_opening_id: string
          linkedin_url: string | null
          location: string | null
          notice_period: string | null
          phone: string
          portfolio_url: string | null
          reference: string | null
          resume_mime_type: string
          resume_original_name: string
          resume_path: string
          resume_size_bytes: number
          reviewed_at: string | null
          salary_expectation: string | null
          status: string
          updated_at: string
          work_authorization: boolean | null
          years_experience: number | null
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          current_company?: string | null
          current_job_title?: string | null
          email: string
          full_name: string
          id?: string
          interest_reason?: string | null
          internal_notes?: string | null
          job_opening_id: string
          linkedin_url?: string | null
          location?: string | null
          notice_period?: string | null
          phone: string
          portfolio_url?: string | null
          reference?: string | null
          resume_mime_type: string
          resume_original_name: string
          resume_path: string
          resume_size_bytes: number
          reviewed_at?: string | null
          salary_expectation?: string | null
          status?: string
          updated_at?: string
          work_authorization?: boolean | null
          years_experience?: number | null
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          current_company?: string | null
          current_job_title?: string | null
          email?: string
          full_name?: string
          id?: string
          interest_reason?: string | null
          internal_notes?: string | null
          job_opening_id?: string
          linkedin_url?: string | null
          location?: string | null
          notice_period?: string | null
          phone?: string
          portfolio_url?: string | null
          reference?: string | null
          resume_mime_type?: string
          resume_original_name?: string
          resume_path?: string
          resume_size_bytes?: number
          reviewed_at?: string | null
          salary_expectation?: string | null
          status?: string
          updated_at?: string
          work_authorization?: boolean | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_opening_id_fkey"
            columns: ["job_opening_id"]
            isOneToOne: false
            referencedRelation: "job_openings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_openings: {
        Row: {
          application_deadline: string | null
          application_email: string | null
          application_url: string | null
          benefits: Json | null
          created_at: string
          department: string | null
          description: string
          employment_type: string
          featured: boolean
          id: string
          location: string | null
          published_at: string | null
          requirements: Json | null
          responsibilities: Json | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          show_salary: boolean
          slug: string
          status: string
          summary: string
          title: string
          updated_at: string
          workplace_type: string
        }
        Insert: {
          application_deadline?: string | null
          application_email?: string | null
          application_url?: string | null
          benefits?: Json | null
          created_at?: string
          department?: string | null
          description: string
          employment_type: string
          featured?: boolean
          id?: string
          location?: string | null
          published_at?: string | null
          requirements?: Json | null
          responsibilities?: Json | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          show_salary?: boolean
          slug: string
          status?: string
          summary: string
          title: string
          updated_at?: string
          workplace_type: string
        }
        Update: {
          application_deadline?: string | null
          application_email?: string | null
          application_url?: string | null
          benefits?: Json | null
          created_at?: string
          department?: string | null
          description?: string
          employment_type?: string
          featured?: boolean
          id?: string
          location?: string | null
          published_at?: string | null
          requirements?: Json | null
          responsibilities?: Json | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          show_salary?: boolean
          slug?: string
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          workplace_type?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          metadata: Json | null
          read_at: string | null
          source_id: string | null
          source_table: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          source_id?: string | null
          source_table: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          source_id?: string | null
          source_table?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_id: string | null
          client_name: string | null
          created_at: string
          created_by_staff_id: string
          description: string | null
          due_date: string | null
          id: string
          name: string
          project_code: string
          project_type: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          created_by_staff_id: string
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          project_code: string
          project_type?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          created_by_staff_id?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          project_code?: string
          project_type?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_staff_id_fkey"
            columns: ["created_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_submissions: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          organization: string | null
          payload: Json | null
          phone_number: string | null
          project_details: string | null
          tally_submission_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          organization?: string | null
          payload?: Json | null
          phone_number?: string | null
          project_details?: string | null
          tally_submission_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          organization?: string | null
          payload?: Json | null
          phone_number?: string | null
          project_details?: string | null
          tally_submission_id?: string | null
        }
        Relationships: []
      }
      receipts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          gateway_response: string | null
          id: string
          invoice_id: string
          invoice_number: string
          invoice_payment_attempt_id: string
          issued_at: string
          metadata: Json
          notes: string | null
          paid_at: string
          payment_method: string | null
          payment_provider: string
          payment_reference: string
          provider_transaction_id: number | null
          receipt_number: string
          refunded_at: string | null
          revenue_transaction_id: string
          status: Database["public"]["Enums"]["receipt_status"]
          updated_at: string
          voided_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          gateway_response?: string | null
          id?: string
          invoice_id: string
          invoice_number: string
          invoice_payment_attempt_id: string
          issued_at?: string
          metadata?: Json
          notes?: string | null
          paid_at: string
          payment_method?: string | null
          payment_provider?: string
          payment_reference: string
          provider_transaction_id?: number | null
          receipt_number?: string
          refunded_at?: string | null
          revenue_transaction_id: string
          status?: Database["public"]["Enums"]["receipt_status"]
          updated_at?: string
          voided_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          gateway_response?: string | null
          id?: string
          invoice_id?: string
          invoice_number?: string
          invoice_payment_attempt_id?: string
          issued_at?: string
          metadata?: Json
          notes?: string | null
          paid_at?: string
          payment_method?: string | null
          payment_provider?: string
          payment_reference?: string
          provider_transaction_id?: number | null
          receipt_number?: string
          refunded_at?: string | null
          revenue_transaction_id?: string
          status?: Database["public"]["Enums"]["receipt_status"]
          updated_at?: string
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_invoice_payment_attempt_id_fkey"
            columns: ["invoice_payment_attempt_id"]
            isOneToOne: true
            referencedRelation: "invoice_payment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_revenue_transaction_id_fkey"
            columns: ["revenue_transaction_id"]
            isOneToOne: true
            referencedRelation: "finance_reconciliation_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_revenue_transaction_id_fkey"
            columns: ["revenue_transaction_id"]
            isOneToOne: true
            referencedRelation: "finance_refundable_transactions"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "receipts_revenue_transaction_id_fkey"
            columns: ["revenue_transaction_id"]
            isOneToOne: true
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      review_submissions: {
        Row: {
          bootcamp_experience: string | null
          created_at: string | null
          email: string | null
          id: string
          miscellaneous: string | null
          payload: Json | null
          ratings: Json | null
          referral_source: string | null
          tally_submission_id: string | null
        }
        Insert: {
          bootcamp_experience?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          miscellaneous?: string | null
          payload?: Json | null
          ratings?: Json | null
          referral_source?: string | null
          tally_submission_id?: string | null
        }
        Update: {
          bootcamp_experience?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          miscellaneous?: string | null
          payload?: Json | null
          ratings?: Json | null
          referral_source?: string | null
          tally_submission_id?: string | null
        }
        Relationships: []
      }
      service_section: {
        Row: {
          badge: string | null
          id: string
          subtitle: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          badge?: string | null
          id?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          badge?: string | null
          id?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          badge: string | null
          button_text: string | null
          button_url: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          highlight: boolean | null
          id: string
          is_active: boolean | null
          title: string
        }
        Insert: {
          badge?: string | null
          button_text?: string | null
          button_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          highlight?: boolean | null
          id?: string
          is_active?: boolean | null
          title: string
        }
        Update: {
          badge?: string | null
          button_text?: string | null
          button_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          highlight?: boolean | null
          id?: string
          is_active?: boolean | null
          title?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          address: string | null
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          department: string
          email: string
          emergency_contact: string | null
          emergency_phone: string | null
          employee_id: string
          employment_type: string | null
          first_name: string
          hire_date: string | null
          id: string
          last_name: string
          manager: string | null
          notes: string | null
          phone: string | null
          position: string
          salary: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department: string
          email: string
          emergency_contact?: string | null
          emergency_phone?: string | null
          employee_id: string
          employment_type?: string | null
          first_name: string
          hire_date?: string | null
          id?: string
          last_name: string
          manager?: string | null
          notes?: string | null
          phone?: string | null
          position: string
          salary?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department?: string
          email?: string
          emergency_contact?: string | null
          emergency_phone?: string | null
          employee_id?: string
          employment_type?: string | null
          first_name?: string
          hire_date?: string | null
          id?: string
          last_name?: string
          manager?: string | null
          notes?: string | null
          phone?: string | null
          position?: string
          salary?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_manager_fkey"
            columns: ["manager"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          project_id: string | null
          staff_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          staff_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          staff_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          company: string | null
          created_at: string
          display_order: number
          full_name: string
          id: string
          is_active: boolean
          position: string
          rating: number
          testimonial: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          display_order?: number
          full_name: string
          id?: string
          is_active?: boolean
          position: string
          rating?: number
          testimonial: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          display_order?: number
          full_name?: string
          id?: string
          is_active?: boolean
          position?: string
          rating?: number
          testimonial?: string
          updated_at?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          event_type: string | null
          form_id: string | null
          id: string
          payload: Json | null
          status: string | null
          submission_id: string | null
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          form_id?: string | null
          id?: string
          payload?: Json | null
          status?: string | null
          submission_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string | null
          form_id?: string | null
          id?: string
          payload?: Json | null
          status?: string | null
          submission_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      finance_budget_allocation_summary: {
        Row: {
          allocated_amount: number | null
          allocation_id: string | null
          budget_id: string | null
          budget_name: string | null
          budget_status: string | null
          currency: string | null
          end_date: string | null
          remaining_amount: number | null
          start_date: string | null
          transaction_category: string | null
          usage_percentage: number | null
          used_amount: number | null
          warning_threshold: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_budget_allocations_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "finance_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_reconciliation_transactions: {
        Row: {
          amount: number | null
          amount_difference: number | null
          bank_account: string | null
          base_amount: number | null
          base_currency: string | null
          created_at: string | null
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          description: string | null
          dispute_reason: string | null
          exchange_rate: number | null
          external_amount: number | null
          fee_amount: number | null
          id: string | null
          internal_reference: string | null
          invoice_number: string | null
          paid_at: string | null
          payment_method: string | null
          provider: string | null
          provider_reference: string | null
          receipt_number: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_notes: string | null
          reconciliation_reference: string | null
          reconciliation_status: string | null
          refunded_amount: number | null
          settlement_date: string | null
          source_id: string | null
          source_table: string | null
          status: string | null
          tax_amount: number | null
          transaction_category: string | null
          transaction_date: string | null
          transaction_type: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          amount_difference?: never
          bank_account?: string | null
          base_amount?: number | null
          base_currency?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          dispute_reason?: string | null
          exchange_rate?: number | null
          external_amount?: number | null
          fee_amount?: number | null
          id?: string | null
          internal_reference?: string | null
          invoice_number?: string | null
          paid_at?: string | null
          payment_method?: string | null
          provider?: string | null
          provider_reference?: string | null
          receipt_number?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_notes?: string | null
          reconciliation_reference?: string | null
          reconciliation_status?: string | null
          refunded_amount?: number | null
          settlement_date?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string | null
          tax_amount?: number | null
          transaction_category?: string | null
          transaction_date?: string | null
          transaction_type?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          amount_difference?: never
          bank_account?: string | null
          base_amount?: number | null
          base_currency?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          dispute_reason?: string | null
          exchange_rate?: number | null
          external_amount?: number | null
          fee_amount?: number | null
          id?: string | null
          internal_reference?: string | null
          invoice_number?: string | null
          paid_at?: string | null
          payment_method?: string | null
          provider?: string | null
          provider_reference?: string | null
          receipt_number?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_notes?: string | null
          reconciliation_reference?: string | null
          reconciliation_status?: string | null
          refunded_amount?: number | null
          settlement_date?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string | null
          tax_amount?: number | null
          transaction_category?: string | null
          transaction_date?: string | null
          transaction_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      finance_refundable_transactions: {
        Row: {
          amount: number | null
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          description: string | null
          internal_reference: string | null
          invoice_number: string | null
          paid_at: string | null
          payment_method: string | null
          provider: string | null
          provider_reference: string | null
          receipt_number: string | null
          refundable_amount: number | null
          refunded_amount: number | null
          source_id: string | null
          source_table: string | null
          status: string | null
          transaction_date: string | null
          transaction_id: string | null
        }
        Insert: {
          amount?: number | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          description?: string | null
          internal_reference?: string | null
          invoice_number?: string | null
          paid_at?: string | null
          payment_method?: string | null
          provider?: string | null
          provider_reference?: string | null
          receipt_number?: string | null
          refundable_amount?: never
          refunded_amount?: number | null
          source_id?: string | null
          source_table?: string | null
          status?: string | null
          transaction_date?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          description?: string | null
          internal_reference?: string | null
          invoice_number?: string | null
          paid_at?: string | null
          payment_method?: string | null
          provider?: string | null
          provider_reference?: string | null
          receipt_number?: string | null
          refundable_amount?: never
          refunded_amount?: number | null
          source_id?: string | null
          source_table?: string | null
          status?: string | null
          transaction_date?: string | null
          transaction_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_invoice_with_items: {
        Args: { p_invoice: Json; p_items: Json }
        Returns: string
      }
      dispute_financial_transaction: {
        Args: {
          p_dispute_reason: string
          p_evidence_url?: string
          p_external_amount?: number
          p_external_reference?: string
          p_metadata?: Json
          p_notes?: string
          p_performed_by?: string
          p_settlement_date?: string
          p_transaction_id: string
        }
        Returns: {
          amount: number
          archived_at: string | null
          bank_account: string | null
          base_amount: number | null
          base_currency: string
          client_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          description: string
          dispute_reason: string | null
          exchange_rate: number
          external_amount: number | null
          fee_amount: number
          id: string
          internal_notes: string | null
          internal_reference: string
          invoice_number: string | null
          metadata: Json
          paid_at: string | null
          payment_method: string | null
          provider: string
          provider_payload: Json
          provider_reference: string | null
          receipt_number: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_notes: string | null
          reconciliation_reference: string | null
          reconciliation_status: string
          refunded_amount: number
          settlement_date: string | null
          source_id: string | null
          source_table: string | null
          status: string
          tax_amount: number
          transaction_category: string
          transaction_date: string
          transaction_type: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "financial_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_certificate_number: { Args: never; Returns: string }
      generate_client_code: { Args: never; Returns: string }
      generate_finance_refund_reference: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_project_code: {
        Args: { project_type_value: string }
        Returns: string
      }
      generate_receipt_number: { Args: never; Returns: string }
      get_company_financial_summary: {
        Args: never
        Returns: {
          currency: string
          current_month_expenses: number
          current_month_net_income: number
          current_month_refunds: number
          current_month_revenue: number
          growth_percentage: number
          paid_income_transactions: number
          pending_income: number
          previous_month_revenue: number
          total_revenue: number
        }[]
      }
      increment_post_views: { Args: { post_id: string }; Returns: undefined }
      is_finance_staff: { Args: never; Returns: boolean }
      process_invoice_payment_success: {
        Args: {
          p_amount: number
          p_channel: string
          p_currency: string
          p_gateway_response: string
          p_paid_at: string
          p_paystack_transaction_id: number
          p_raw_response: Json
          p_reference: string
        }
        Returns: {
          amount_due: number
          amount_paid: number
          archived_at: string | null
          billing_address: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_company: string | null
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          delivery_status: Database["public"]["Enums"]["invoice_delivery_status"]
          discount_amount: number
          discount_type: Database["public"]["Enums"]["invoice_discount_type"]
          discount_value: number
          due_date: string
          id: string
          internal_notes: string | null
          invoice_number: string
          issue_date: string
          notes: string | null
          paid_at: string | null
          payment_reference: string | null
          project_id: string | null
          purchase_order_number: string | null
          revenue_transaction_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal_amount: number
          tax_amount: number
          terms: string | null
          total_amount: number
          updated_at: string
          viewed_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      process_successful_finance_refund: {
        Args: {
          p_processed_by?: string
          p_provider_payload?: Json
          p_provider_refund_reference?: string
          p_refund_id: string
          p_refunded_amount: number
        }
        Returns: {
          approved_amount: number | null
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          cancelled_at: string | null
          created_at: string
          currency: string
          failed_at: string | null
          id: string
          internal_notes: string | null
          invoice_id: string | null
          metadata: Json
          original_transaction_id: string
          payment_method: string | null
          processed_at: string | null
          processed_by: string | null
          provider: string
          provider_payload: Json
          provider_refund_reference: string | null
          reason: string
          receipt_id: string | null
          refund_reference: string
          refunded_amount: number
          rejected_at: string | null
          rejected_by: string | null
          requested_amount: number
          requested_at: string
          requested_by: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "finance_refunds"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reconcile_financial_transaction: {
        Args: {
          p_evidence_url?: string
          p_external_amount: number
          p_external_reference: string
          p_metadata?: Json
          p_notes?: string
          p_performed_by?: string
          p_settlement_date: string
          p_transaction_id: string
        }
        Returns: {
          amount: number
          archived_at: string | null
          bank_account: string | null
          base_amount: number | null
          base_currency: string
          client_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          description: string
          dispute_reason: string | null
          exchange_rate: number
          external_amount: number | null
          fee_amount: number
          id: string
          internal_notes: string | null
          internal_reference: string
          invoice_number: string | null
          metadata: Json
          paid_at: string | null
          payment_method: string | null
          provider: string
          provider_payload: Json
          provider_reference: string | null
          receipt_number: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_notes: string | null
          reconciliation_reference: string | null
          reconciliation_status: string
          refunded_amount: number
          settlement_date: string | null
          source_id: string | null
          source_table: string | null
          status: string
          tax_amount: number
          transaction_category: string
          transaction_date: string
          transaction_type: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "financial_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_invoice_payment: {
        Args: {
          p_amount: number
          p_invoice_id: string
          p_payment_reference?: string
          p_revenue_transaction_id?: string
        }
        Returns: {
          amount_due: number
          amount_paid: number
          archived_at: string | null
          billing_address: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_company: string | null
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          delivery_status: Database["public"]["Enums"]["invoice_delivery_status"]
          discount_amount: number
          discount_type: Database["public"]["Enums"]["invoice_discount_type"]
          discount_value: number
          due_date: string
          id: string
          internal_notes: string | null
          invoice_number: string
          issue_date: string
          notes: string | null
          paid_at: string | null
          payment_reference: string | null
          project_id: string | null
          purchase_order_number: string | null
          revenue_transaction_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal_amount: number
          tax_amount: number
          terms: string | null
          total_amount: number
          updated_at: string
          viewed_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      replace_draft_invoice: {
        Args: { p_invoice: Json; p_invoice_id: string; p_items: Json }
        Returns: string
      }
      undo_financial_reconciliation: {
        Args: {
          p_metadata?: Json
          p_notes?: string
          p_performed_by?: string
          p_transaction_id: string
        }
        Returns: {
          amount: number
          archived_at: string | null
          bank_account: string | null
          base_amount: number | null
          base_currency: string
          client_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          description: string
          dispute_reason: string | null
          exchange_rate: number
          external_amount: number | null
          fee_amount: number
          id: string
          internal_notes: string | null
          internal_reference: string
          invoice_number: string | null
          metadata: Json
          paid_at: string | null
          payment_method: string | null
          provider: string
          provider_payload: Json
          provider_reference: string | null
          receipt_number: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_notes: string | null
          reconciliation_reference: string | null
          reconciliation_status: string
          refunded_amount: number
          settlement_date: string | null
          source_id: string | null
          source_table: string | null
          status: string
          tax_amount: number
          transaction_category: string
          transaction_date: string
          transaction_type: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "financial_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      who_am_i: {
        Args: never
        Returns: {
          role: string
          uid: string
        }[]
      }
    }
    Enums: {
      academy_certificate_status:
        | "not_eligible"
        | "eligible"
        | "generated"
        | "revoked"
      academy_delivery_mode: "online" | "onsite" | "hybrid" | "self_paced"
      academy_payment_status:
        | "pending"
        | "processing"
        | "paid"
        | "failed"
        | "refunded"
        | "cancelled"
      academy_program_status: "draft" | "published" | "archived"
      academy_registration_status:
        | "pending"
        | "confirmed"
        | "enrolled"
        | "completed"
        | "cancelled"
      invoice_delivery_status:
        | "not_sent"
        | "queued"
        | "sent"
        | "delivered"
        | "failed"
      invoice_discount_type: "fixed" | "percentage"
      invoice_payment_attempt_status:
        | "initialized"
        | "pending"
        | "successful"
        | "failed"
        | "cancelled"
        | "expired"
      invoice_status:
        | "draft"
        | "sent"
        | "viewed"
        | "partially_paid"
        | "paid"
        | "overdue"
        | "cancelled"
        | "refunded"
      receipt_status: "issued" | "voided" | "refunded"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      academy_certificate_status: [
        "not_eligible",
        "eligible",
        "generated",
        "revoked",
      ],
      academy_delivery_mode: ["online", "onsite", "hybrid", "self_paced"],
      academy_payment_status: [
        "pending",
        "processing",
        "paid",
        "failed",
        "refunded",
        "cancelled",
      ],
      academy_program_status: ["draft", "published", "archived"],
      academy_registration_status: [
        "pending",
        "confirmed",
        "enrolled",
        "completed",
        "cancelled",
      ],
      invoice_delivery_status: [
        "not_sent",
        "queued",
        "sent",
        "delivered",
        "failed",
      ],
      invoice_discount_type: ["fixed", "percentage"],
      invoice_payment_attempt_status: [
        "initialized",
        "pending",
        "successful",
        "failed",
        "cancelled",
        "expired",
      ],
      invoice_status: [
        "draft",
        "sent",
        "viewed",
        "partially_paid",
        "paid",
        "overdue",
        "cancelled",
        "refunded",
      ],
      receipt_status: ["issued", "voided", "refunded"],
    },
  },
} as const
