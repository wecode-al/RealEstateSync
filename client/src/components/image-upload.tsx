import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Image, X } from "lucide-react";

interface ImageUploadProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    // For demo purposes, we'll use a stock photo URL instead of actually uploading
    const stockPhotos = [
      "https://images.unsplash.com/photo-1513584684374-8bab748fbf90",
      "https://images.unsplash.com/photo-1416331108676-a22ccb276e35",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
      "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf",
      "https://images.unsplash.com/photo-1496328488450-9c5c5d555148",
      "https://images.unsplash.com/photo-1499955085172-a104c9463ece"
    ];

    const randomPhoto = stockPhotos[Math.floor(Math.random() * stockPhotos.length)];
    onChange([...value, randomPhoto]);
    setError(null);
  };

  const removeImage = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {value.map((url, index) => (
          <Card key={index} className="relative group">
            <img
              src={url}
              alt={`Property image ${index + 1}`}
              className="w-full h-40 object-cover rounded"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeImage(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-center w-full">
        <label className="w-full">
          <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors">
            <Image className="w-8 h-8 mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Click to upload images
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
          />
        </label>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
