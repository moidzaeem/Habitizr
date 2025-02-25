import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";

export function AiHelperSettings() {
  const { user, updateUser } = useUser();
  const { toast } = useToast();
  const [aiHelperName, setAiHelperName] = useState(user?.aiHelperName || "");
  const [isEditing, setIsEditing] = useState(false);

  const handleNameUpdate = async () => {
    if (!aiHelperName.trim()) {
      toast({
        title: "Name required",
        description: "Please provide a name for your AI helper.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateUser({ aiHelperName: aiHelperName.trim() });
      setIsEditing(false);
      toast({
        title: "Name updated",
        description: `Your AI helper will now be called ${aiHelperName}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update AI helper name. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 max-w-5xl">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>AI Helper Settings</CardTitle>
          <CardDescription>
            Customize how your AI habit coach interacts with you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>AI Helper Name</Label>
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  value={aiHelperName}
                  onChange={(e) => setAiHelperName(e.target.value)}
                  placeholder="Enter a name"
                  className="max-w-md"
                />
                <Button onClick={handleNameUpdate}>Save</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAiHelperName(user?.aiHelperName || "");
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-lg font-medium">{user?.aiHelperName}</p>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Change Name
                </Button>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              This name will be used in your SMS reminders and conversations
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}