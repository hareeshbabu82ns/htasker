"use client";

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tracker, TrackerType, TrackerStatus } from "@/types";
import { createTracker, updateTracker } from "@/app/actions/trackers";

// Schema for form validation
const formSchema = z.object( {
  name: z.string().min( 1, "Name is required" ).max( 50, "Name must be 50 characters or less" ),
  description: z.string().max( 200, "Description must be 200 characters or less" ).optional(),
  type: z.nativeEnum( TrackerType, {
    required_error: "Tracker type is required",
    invalid_type_error: "Invalid tracker type",
  } ),
  status: z.nativeEnum( TrackerStatus ).optional(),
  tags: z.array( z.string() ).default( [] ),
  color: z.string().regex( /^#([0-9a-f]{3}){1,2}$/i, "Invalid color format" ).optional(),
  icon: z.string().optional(),
} );

type FormValues = z.infer<typeof formSchema>;

interface TrackerFormProps {
  initialData?: Partial<Tracker>;
  trackerId?: string;
  onSuccess?: () => void;
}

export default function TrackerForm( { initialData, trackerId, onSuccess }: TrackerFormProps ) {
  const router = useRouter();
  const [ isSubmitting, setIsSubmitting ] = useState( false );
  const [ error, setError ] = useState<string | null>( null );
  const [ tagInput, setTagInput ] = useState( "" );

  const isEditing = Boolean( trackerId );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormValues>( {
    resolver: zodResolver( formSchema ),
    defaultValues: initialData
      ? {
        name: initialData.name,
        description: initialData.description || "",
        type: initialData.type,
        status: initialData.status,
        tags: initialData.tags || [],
        color: initialData.color || "#3B82F6",
        icon: initialData.icon || "",
      }
      : {
        name: "",
        description: "",
        type: TrackerType.TIMER,
        status: TrackerStatus.ACTIVE,
        tags: [],
        color: "#3B82F6",
      },
  } );

  useEffect( () => {
    if ( initialData ) {
      reset( {
        name: initialData.name,
        description: initialData.description || "",
        type: initialData.type,
        status: initialData.status,
        tags: initialData.tags || [],
        color: initialData.color || "#3B82F6",
        icon: initialData.icon || "",
      } );
    } else {
      reset( {
        name: "",
        description: "",
        type: TrackerType.TIMER,
        status: TrackerStatus.ACTIVE,
        tags: [],
        color: "#3B82F6",
      } );
    }
  }, [ initialData, reset ] );

  const formValues = watch();

  const onSubmit: SubmitHandler<FormValues> = async ( data ) => {
    setIsSubmitting( true );
    setError( null );

    try {
      let result;

      if ( isEditing && trackerId ) {
        const updateData: Partial<Omit<Tracker, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'type'>> = {
          name: data.name,
          description: data.description,
          status: data.status,
          tags: data.tags,
          color: data.color,
          icon: data.icon,
        };
        result = await updateTracker( trackerId, updateData );
      } else {
        const createData: Omit<Tracker, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'status'> & { status?: TrackerStatus } = {
          name: data.name,
          description: data.description,
          type: data.type,
          tags: data.tags,
          color: data.color,
          icon: data.icon,
        };
        result = await createTracker( createData );
      }

      if ( result.success ) {
        if ( onSuccess ) {
          onSuccess();
        } else {
          router.push( `/trackers/${isEditing ? trackerId : result.data.id}` );
          router.refresh();
        }
      } else {
        setError( result.error || "Failed to save tracker" );
      }
    } catch ( e ) {
      setError( "An unexpected error occurred" );
      console.error( e );
    } finally {
      setIsSubmitting( false );
    }
  };

  const handleReset = () => {
    reset(
      initialData
        ? {
          name: initialData.name,
          description: initialData.description || "",
          type: initialData.type,
          status: initialData.status,
          tags: initialData.tags || [],
          color: initialData.color || "#3B82F6",
          icon: initialData.icon || "",
        }
        : {
          name: "",
          description: "",
          type: TrackerType.TIMER,
          status: TrackerStatus.ACTIVE,
          tags: [],
          color: "#3B82F6",
        }
    );
    setError( null );
  };

  const handleAddTag = () => {
    if ( tagInput.trim() && !( formValues.tags || [] ).includes( tagInput.trim() ) ) {
      const newTags = [ ...( formValues.tags || [] ), tagInput.trim() ];
      setValue( "tags", newTags );
      setTagInput( "" );
    }
  };

  const handleRemoveTag = ( tagToRemove: string ) => {
    setValue(
      "tags",
      ( formValues.tags || [] ).filter( ( tag ) => tag !== tagToRemove )
    );
  };

  const handleTagKeyPress = ( e: React.KeyboardEvent ) => {
    if ( e.key === "Enter" ) {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <form onSubmit={handleSubmit( onSubmit )} className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 dark:bg-red-900/30 dark:border-red-700">
          <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium">
          Tracker Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary/50 focus:border-primary ${errors.name
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/50"
            : "border-gray-300 dark:border-gray-700"
            } bg-background`}
          placeholder="Enter tracker name"
          {...register( "name" )}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary dark:border-gray-700 bg-background"
          placeholder="Enter a description (optional)"
          {...register( "description" )}
        ></textarea>
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="type" className="block text-sm font-medium">
          Tracker Type <span className="text-red-500">*</span>
        </label>
        <select
          id="type"
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary/50 focus:border-primary 
            ${isEditing ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed" : "bg-background"} 
            ${errors.type ? "border-red-500" : "border-gray-300 dark:border-gray-700"}`}
          {...register( "type" )}
          disabled={isEditing}
        >
          <option value={TrackerType.TIMER}>Timer - Track time durations</option>
          <option value={TrackerType.COUNTER}>Counter - Track counts</option>
          <option value={TrackerType.AMOUNT}>Amount - Track numerical values</option>
          <option value={TrackerType.OCCURRENCE}>Occurrence - Track events</option>
          <option value={TrackerType.CUSTOM}>Custom - Custom tracking</option>
        </select>
        {errors.type && (
          <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
        )}
        {isEditing && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Tracker type cannot be changed after creation.
          </p>
        )}
      </div>

      {isEditing && (
        <div className="space-y-2">
          <label htmlFor="status" className="block text-sm font-medium">
            Status
          </label>
          <select
            id="status"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary/50 focus:border-primary bg-background
              ${errors.status ? "border-red-500" : "border-gray-300 dark:border-gray-700"}`}
            {...register( "status" )}
          >
            <option value={TrackerStatus.ACTIVE}>Active</option>
            <option value={TrackerStatus.INACTIVE}>Inactive</option>
            <option value={TrackerStatus.ARCHIVED}>Archived</option>
          </select>
          {errors.status && (
            <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="tags" className="block text-sm font-medium">
          Tags
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            id="tagInput"
            className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary dark:border-gray-700 bg-background"
            placeholder="Add tags (press Enter)"
            value={tagInput}
            onChange={( e ) => setTagInput( e.target.value )}
            onKeyPress={handleTagKeyPress}
          />
          <Button
            type="button"
            onClick={handleAddTag}
            variant="secondary"
            size="sm"
          >
            Add
          </Button>
        </div>

        {( formValues.tags?.length ?? 0 ) > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formValues.tags?.map( ( tag ) => (
              <div
                key={tag}
                className="flex items-center bg-primary/10 text-primary px-2 py-1 rounded-full text-sm"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  className="ml-1 text-primary hover:text-primary/80"
                  onClick={() => handleRemoveTag( tag )}
                >
                  &times;
                </button>
              </div>
            ) )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="color" className="block text-sm font-medium">
          Color
        </label>
        <div className="flex items-center space-x-3">
          <input
            type="color"
            id="colorPicker"
            className="w-10 h-10 p-0 border-none rounded-md cursor-pointer"
            {...register( "color" )}
            value={formValues.color || "#3B82F6"}
            onChange={( e ) => setValue( "color", e.target.value )}
          />
          <input
            type="text"
            id="colorText"
            className={`flex-grow px-3 py-2 border rounded-md shadow-sm focus:ring-primary/50 focus:border-primary dark:border-gray-700 bg-background ${errors.color ? "border-red-500" : "border-gray-300"
              }`}
            placeholder="#3B82F6"
            {...register( "color" )}
          />
        </div>
        {errors.color && (
          <p className="mt-1 text-sm text-red-600">{errors.color.message}</p>
        )}
      </div>

      {/* Icon field (Optional) */}
      {/* Add icon selection logic here if needed */}

      {/* Form submission */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handleReset}
          disabled={isSubmitting}
        >
          Reset
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : isEditing ? (
            "Update Tracker"
          ) : (
            "Create Tracker"
          )}
        </Button>
      </div>
    </form>
  );
}