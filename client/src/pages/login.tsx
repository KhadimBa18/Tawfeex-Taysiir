import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import generatedImage from '@assets/generated_images/modern_logo_for_school_app_tawfeex_ak_taysiir.png';

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const success = await login(username, password);
      if (success) {
        toast({
          title: "Connexion réussie",
          description: "Bienvenue dans Tawfeex_ak_Taysiir",
          variant: "default",
        });
        setLocation("/");
      } else {
        toast({
          title: "Erreur de connexion",
          description: "Identifiants incorrects. Essayez Tawfeex / Taysiir",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-24 h-24 bg-white rounded-2xl shadow-md p-4 flex items-center justify-center">
             <img src={generatedImage} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-primary">Tawfeex_ak_Taysiir</CardTitle>
            <CardDescription className="text-base mt-2">
              Gestion scolaire offline-first<br/>pour le Sénégal
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Identifiant</Label>
              <Input 
                id="username" 
                placeholder="Ex: Tawfeex" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="Ex: Taysiir" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                required
              />
            </div>
            
            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><LogIn className="w-5 h-5 mr-2" /> Se connecter</>}
            </Button>

            <div className="text-center text-xs text-muted-foreground pt-4 border-t">
              <p>Identifiants par défaut : <strong>Tawfeex</strong> / <strong>Taysiir</strong></p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
