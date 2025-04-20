"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteTracker } from "@/app/actions/trackers";

interface DeleteTrackerButtonProps {
  trackerId: string;
}

export default function DeleteTrackerButton( { trackerId }: DeleteTrackerButtonProps ) {
  const router = useRouter();
  const [ isDeleting, setIsDeleting ] = useState( false );
  const [ showConfirmation, setShowConfirmation ] = useState( false );

  // Handle initiating the delete process
  const handleDeleteClick = () => {
    setShowConfirmation( true );
  };

  // Handle confirming the delete action
  const handleConfirmDelete = async () => {
    try {
      setIsDeleting( true );
      const response = await deleteTracker( trackerId );

      if ( response.success ) {
        // Redirect to trackers list page after successful deletion
        router.push( "/trackers" );
        router.refresh();
      } else {
        // If there was an error, hide the confirmation dialog and reset state
        console.error( "Failed to delete tracker:", response.error );
        setShowConfirmation( false );
      }
    } catch ( error ) {
      console.error( "Error deleting tracker:", error );
    } finally {
      setIsDeleting( false );
    }
  };

  // Handle canceling the delete action
  const handleCancelDelete = () => {
    setShowConfirmation( false );
  };

  return (
    <>
      {/* Delete button */}
      <Button
        onClick={handleDeleteClick}
        variant="destructive"
        disabled={isDeleting || showConfirmation}
      >
        Delete
      </Button>

      {/* Confirmation dialog (overlay) */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md mx-4 w-full">
            <h3 className="text-lg font-semibold mb-2">Delete Tracker</h3>
            <p className="mb-4">
              Are you sure you want to delete this tracker? This action cannot be undone and all associated entries will also be deleted.
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                onClick={handleCancelDelete}
                variant="ghost"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                variant="destructive"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Forever"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}