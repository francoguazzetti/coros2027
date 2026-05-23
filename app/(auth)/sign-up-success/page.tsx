import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm border border-border bg-card p-8 text-center">
        <div className="mb-6">
          <h1 className="text-xl font-medium text-foreground">Coro</h1>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">
            Revisá tu email
          </h2>
          <p className="text-sm text-muted-foreground">
            Te enviamos un link de confirmación a tu correo electrónico. 
            Hacé click en el link para activar tu cuenta.
          </p>
        </div>

        <div className="mt-8">
          <Button asChild variant="outline" className="w-full border-border">
            <Link href="/auth/login">
              Volver al inicio de sesión
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
