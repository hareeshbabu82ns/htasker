"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTracker } from "@/hooks/useTracker";
import { TrackerFormValues, TrackerType } from "@/types";

// Schema for form validation
const formSchema = z.object( {
  name: z.string().min( 1, "Name is required" ).max( 50, "Name must be 50 characters or less" ),
  description: z.string().max( 200, "Description must be 200 characters or less" ).optional(),
  type: z.enum( [
    TrackerType.TIMER,
    TrackerType.COUNTER,
    TrackerType.AMOUNT,
    TrackerType.OCCURRENCE,
    TrackerType.CUSTOM
  ], {
    required_error: "Tracker type is required",
    invalid_type_error: "Invalid tracker type",
  } ),
  tags: z.array( z.string() ).default( [] ),
  color: z.string().regex( /^#([0-9a-f]{3}){1,2}$/i, "Invalid color format" ).optional(),
  icon: z.string().optional(),
} );

interface TrackerFormProps {
  initialData?: TrackerFormValues;
  trackerId?: string;
  onSuccess?: () => void;
}

export default function TrackerForm( { initialData, trackerId, onSuccess }: TrackerFormProps ) {
  const router = useRouter();
  const { addTracker } = useTracker();
  const [ isSubmitting, setIsSubmitting ] = useState( false );
  const [ error, setError ] = useState<string | null>( null );
  const [ tagInput, setTagInput ] = useState( "" );

  const isEditing = Boolean( trackerId );

  // Initialize form with default values or initial data
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<TrackerFormValues>( {
    resolver: zodResolver( formSchema ),
    defaultValues: initialData || {
      name: "",
      description: "",
      type: TrackerType.TIMER,
      tags: [],
      color: "#3B82F6", // Default blue color
    },
  } );

  // Watch the form values
  const formValues = watch();

  // Handle form submission
  const onSubmit = async ( data: TrackerFormValues ) => {
    setIsSubmitting( true );
    setError( null );

    try {
      // Create FormData object for server action
      const formData = new FormData();
      formData.append( "name", data.name );

      if ( data.description ) {
        formData.append( "description", data.description );
      }

      formData.append( "type", data.type );

      // Add each tag as a separate form field
      data.tags.forEach( tag => {
        formData.append( "tags", tag );
      } );

      if ( data.color ) {
        formData.append( "color", data.color );
      }

      if ( data.icon ) {
        formData.append( "icon", data.icon );
      }

      // Use addTracker from useTracker hook
      const result = await addTracker( formData );

      if ( result.success ) {
        // Reset form if successful
        reset();

        // Call onSuccess callback if provided
        if ( onSuccess ) {
          onSuccess();
        } else {
          // Navigate to the tracker details page or dashboard
          router.push( `/dashboard/trackers/${result.data.id}` );
          router.refresh();
        }
      } else {
        setError( result.errors ? result.errors.message || "Please check form errors" : "Failed to create tracker" );
      }
    } catch ( e ) {
      setError( "An unexpected error occurred" );
    } finally {
      setIsSubmitting( false );
    }
  };

  // Handle adding tags
  const handleAddTag = () => {
    if ( tagInput.trim() && !formValues.tags.includes( tagInput.trim() ) ) {
      const newTags = [ ...formValues.tags, tagInput.trim() ];
      setValue( "tags", newTags );
      setTagInput( "" );
    }
  };

  // Handle removing tags
  const handleRemoveTag = ( tagToRemove: string ) => {
    setValue(
      "tags",
      formValues.tags.filter( ( tag ) => tag !== tagToRemove )
    );
  };

  // Handle key press in tag input
  const handleTagKeyPress = ( e: React.KeyboardEvent ) => {
    if ( e.key === "Enter" ) {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <form onSubmit={handleSubmit( onSubmit )} className="space-y-6">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 dark:bg-red-900/30 dark:border-red-700">
          <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
        </div>
      )}

      {/* Name field */}
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

      {/* Description field */}
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

      {/* Tracker Type field */}
      <div className="space-y-2">
        <label htmlFor="type" className="block text-sm font-medium">
          Tracker Type <span className="text-red-500">*</span>
        </label>
        <select
          id="type"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary dark:border-gray-700 bg-background"
          {...register( "type" )}
          disabled={isEditing} // Disable type change if editing
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
      </div>

      {/* Tags field */}
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

        {/* Tag list */}
        {formValues.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formValues.tags.map( ( tag ) => (
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

      {/* Color picker */}
      <div className="space-y-2">
        <label htmlFor="color" className="block text-sm font-medium">
          Color
        </label>
        <div className="flex items-center space-x-3">
          <input
            type="color"
            id="color"
            className="w-10 h-10 rounded-md border border-gray-300 bg-transparent cursor-pointer dark:border-gray-700"
            {...register( "color" )}
          />
          <input
            type="text"
            className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary dark:border-gray-700 bg-background"
            placeholder="#000000"
            {...register( "color" )}
          />
        </div>
        {errors.color && (
          <p className="mt-1 text-sm text-red-600">{errors.color.message}</p>
        )}
      </div>

      {/* Form submission */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push( "/dashboard/trackers" )}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEditing ? "Update Tracker" : "Create Tracker"}
        </Button>
      </div>
    </form>
  );
}