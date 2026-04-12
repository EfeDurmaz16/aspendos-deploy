type SessionUser = {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    tier?: string;
};

type Session = {
    user: SessionUser;
    session: { id: string; expiresAt: Date | string };
};

export const auth: any = {
    handler: async (_req: Request): Promise<Response> =>
        new Response(JSON.stringify({ error: 'Use /callback for auth' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
        }),
    api: {
        getSession: async (_opts: { headers: Headers }): Promise<Session | null> => null,
    },
    $Infer: {} as {
        Session: {
            user: SessionUser;
            session: Session['session'];
        };
    },
};
