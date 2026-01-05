import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitHubConfig } from "@/lib/github";
import { Github, Loader2, Eye, EyeOff, BookOpen } from "lucide-react";

interface ConnectFormProps {
  onConnect: (config: GitHubConfig) => Promise<boolean>;
  isConnecting: boolean;
  error: string | null;
}

export function ConnectForm({ onConnect, isConnecting, error }: ConnectFormProps) {
  const [token, setToken] = useState("ghp_600TbhQioc9Tir4ecCGqktWV2xxFGL2U8uY");
  const [owner, setOwner] = useState("dunren-cmd");
  const [repo, setRepo] = useState("git-obsidian");
  const [showToken, setShowToken] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !owner || !repo) return;
    await onConnect({ token, owner, repo });
  };

  const isValid = token.length > 0 && owner.length > 0 && repo.length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 glow-primary">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Obsidian Web</h1>
          <p className="text-muted-foreground">連接你的 GitHub 儲存庫作為 Vault</p>
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Token Input */}
            <div className="space-y-2">
              <Label htmlFor="token" className="text-sm font-medium">
                GitHub Personal Access Token
              </Label>
              <div className="relative">
                <Input
                  id="token"
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_600TbhQioc9Tir4ecCGqktWV2xxFGL2U8uY"
                  className="pr-10 bg-input border-border focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                需要 <code className="text-primary">repo</code> 權限來讀寫私人儲存庫
              </p>
            </div>

            {/* Owner Input */}
            <div className="space-y-2">
              <Label htmlFor="owner" className="text-sm font-medium">
                儲存庫擁有者
              </Label>
              <Input
                id="owner"
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="dunren-cmd"
                className="bg-input border-border focus:ring-primary"
              />
            </div>

            {/* Repo Input */}
            <div className="space-y-2">
              <Label htmlFor="repo" className="text-sm font-medium">
                儲存庫名稱
              </Label>
              <Input
                id="repo"
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="git-obsidian"
                className="bg-input border-border focus:ring-primary"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm animate-fade-in">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!isValid || isConnecting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground glow-hover transition-all duration-300"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  連接中...
                </>
              ) : (
                <>
                  <Github className="w-4 h-4 mr-2" />
                  連接 GitHub
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          你的 Token 僅儲存在本地瀏覽器中
        </p>
      </div>
    </div>
  );
}
