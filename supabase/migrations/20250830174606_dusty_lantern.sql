/*
  # Vapi AI Integration Tables

  1. New Tables
    - `organizations`
      - `id` (uuid, primary key)
      - `name` (text)
      - `plan` (enum: free, premium, enterprise)
      - `settings` (jsonb for Vapi API keys and configurations)
      - `billing_info` (jsonb for Stripe data)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - Enhanced `profiles` table
      - Add `organization_id` (uuid, foreign key)
      - Add `role` (enum: admin, user, viewer)
      - Add additional user fields

    - `vapi_assistants` (local cache/config)
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `vapi_assistant_id` (text, Vapi AI assistant ID)
      - `name` (text)
      - `configuration` (jsonb)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `vapi_calls` (local call logs)
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `vapi_call_id` (text, Vapi AI call ID)
      - `assistant_id` (uuid, foreign key)
      - `phone_number` (text)
      - `status` (text)
      - `duration` (integer)
      - `cost` (decimal)
      - `transcript` (text)
      - `recording_url` (text)
      - `metadata` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for multi-tenant access
*/

-- Create enums
CREATE TYPE public.organization_plan_enum AS ENUM ('free', 'premium', 'enterprise');
CREATE TYPE public.user_role_enum AS ENUM ('admin', 'user', 'viewer');

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan public.organization_plan_enum DEFAULT 'free'::public.organization_plan_enum NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb NOT NULL,
  billing_info jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new columns to profiles table
DO $$
BEGIN
  -- Add organization_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
  END IF;

  -- Add role column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role public.user_role_enum DEFAULT 'user'::public.user_role_enum NOT NULL;
  END IF;

  -- Add additional user fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN timezone text DEFAULT 'UTC';
  END IF;
END $$;

-- Create vapi_assistants table
CREATE TABLE IF NOT EXISTS public.vapi_assistants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vapi_assistant_id text UNIQUE NOT NULL,
  name text NOT NULL,
  configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create vapi_calls table
CREATE TABLE IF NOT EXISTS public.vapi_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vapi_call_id text UNIQUE NOT NULL,
  assistant_id uuid REFERENCES public.vapi_assistants(id) ON DELETE SET NULL,
  phone_number text NOT NULL,
  status text DEFAULT 'queued',
  duration integer DEFAULT 0,
  cost decimal(10,4) DEFAULT 0,
  transcript text,
  recording_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vapi_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vapi_calls ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view their organization" ON public.organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can update organization" ON public.organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Vapi assistants policies
CREATE POLICY "Users can manage their own vapi assistants" ON public.vapi_assistants
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Vapi calls policies
CREATE POLICY "Users can manage their own vapi calls" ON public.vapi_calls
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON public.organizations(plan);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_vapi_assistants_user_id ON public.vapi_assistants(user_id);
CREATE INDEX IF NOT EXISTS idx_vapi_assistants_status ON public.vapi_assistants(status);
CREATE INDEX IF NOT EXISTS idx_vapi_calls_user_id ON public.vapi_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_vapi_calls_status ON public.vapi_calls(status);
CREATE INDEX IF NOT EXISTS idx_vapi_calls_created_at ON public.vapi_calls(created_at);

-- Update the existing update_updated_at_column function to handle new tables
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vapi_assistants_updated_at
  BEFORE UPDATE ON public.vapi_assistants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vapi_calls_updated_at
  BEFORE UPDATE ON public.vapi_calls
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update the handle_new_user function to create organization for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  org_id uuid;
  org_name text;
BEGIN
  -- Get organization name from user metadata
  org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', 'Personal Organization');
  
  -- Create organization
  INSERT INTO public.organizations (name, plan)
  VALUES (org_name, 'free')
  RETURNING id INTO org_id;
  
  -- Create profile with organization
  INSERT INTO public.profiles (
    id, 
    organization_id, 
    membership_status, 
    role,
    first_name,
    last_name
  )
  VALUES (
    NEW.id, 
    org_id, 
    'free',
    'admin',
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;