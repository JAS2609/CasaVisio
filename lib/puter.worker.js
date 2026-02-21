const PROJECT_PREFIX = 'CasaVisio_project_';

const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID;
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
const JSONBIN_BASE = process.env.JSONBIN_BASE;

const jsonError = (status, message, extra = {}) =>
    new Response(JSON.stringify({ error: message, ...extra }), {
        status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

const getUserId = async (userPuter) => {
    try {
        const user = await userPuter.auth.getUser();
        return user?.uuid || null;
    } catch { return null; }
};

const getCommunityIndex = async () => {
    try {
        const res = await fetch(`${JSONBIN_BASE}/${JSONBIN_BIN_ID}/latest`, {
            headers: { 'X-Master-Key': JSONBIN_API_KEY }
        });
        if (!res.ok) {
            const errorText = await res.text();
            console.error(`JSONBin GET failed ${res.status}: ${errorText}`);
            return {};
        }
        const data = await res.json();
        return data?.record?.projects ?? {};
    } catch (e) {
        console.error('getCommunityIndex error:', e.message);
        return {};
    }
};

const saveCommunityIndex = async (index) => {
    const res = await fetch(`${JSONBIN_BASE}/${JSONBIN_BIN_ID}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': JSONBIN_API_KEY,
            'X-Bin-Private': 'false'
        },
        body: JSON.stringify({ projects: index })
    });
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`JSONBin PUT failed ${res.status}: ${errorText}`);
    }
    return res.json();
};


router.post('/api/projects/save', async ({ request, user }) => {
    try {
        const userPuter = user?.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const body = await request.json();
        const project = body?.project;
        if (!project?.id || !project?.sourceImage)
            return jsonError(400, 'Project ID and source image are required');

        const visibility = body?.visibility === 'public' ? 'public' : 'private';
        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const existingProject = await userPuter.kv.get(`${PROJECT_PREFIX}${project.id}`);
        if (existingProject && existingProject.ownerId && existingProject.ownerId !== userId) {
            return jsonError(403, 'You do not have permission to modify this project');
        }

        const payload = {
            ...project,
            ownerId: userId,
            isPublic: visibility === 'public',
            updatedAt: new Date().toISOString(),
        };

        await userPuter.kv.set(`${PROJECT_PREFIX}${project.id}`, payload);

        try {
            const index = await getCommunityIndex();
            if (visibility === 'public') {
                index[project.id] = {
                    id: payload.id,
                    name: payload.name,
                    ownerId: payload.ownerId,
                    isPublic: true,
                    timestamp: payload.timestamp,
                    renderedImage: payload.renderedImage,
                    sourceImage: payload.sourceImage,
                    updatedAt: payload.updatedAt,
                };
            } else {
                delete index[project.id];
            }
            await saveCommunityIndex(index);
        } catch (jsonbinError) {
            return jsonError(500, 'JSONBin sync failed', { message: jsonbinError.message });
        }

        return { saved: true, id: project.id, project: payload };
    } catch (e) {
        return jsonError(500, 'Failed to save project', { message: e.message || 'Unknown error' });
    }
});


router.get('/api/projects/list', async ({ user }) => {
    try {
        const userPuter = user?.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const projects = (await userPuter.kv.list(PROJECT_PREFIX, true))
            .map(({ value }) => ({ ...value, isPublic: Boolean(value?.isPublic) }));

        return { projects };
    } catch (e) {
        return jsonError(500, 'Failed to list projects', { message: e.message || 'Unknown error' });
    }
});

router.get('/api/projects/community', async ({ user }) => {
    try {
        const userPuter = user?.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const index = await getCommunityIndex();
        const projects = Object.values(index).filter(Boolean);

        return { projects };
    } catch (e) {
        return jsonError(500, 'Failed to list community projects', { message: e.message || 'Unknown error' });
    }
});

router.get('/api/projects/get', async ({ request, user }) => {
    try {
        const userPuter = user?.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id) return jsonError(400, 'Project ID is required');

        let project = await userPuter.kv.get(`${PROJECT_PREFIX}${id}`);

        if (!project) {
            const index = await getCommunityIndex();
            project = index[id] ?? null;
        }

        if (!project) return jsonError(404, 'Project not found');
        return { project };
    } catch (e) {
        return jsonError(500, 'Failed to get project', { message: e.message || 'Unknown error' });
    }
});