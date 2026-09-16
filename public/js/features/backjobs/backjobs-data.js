// ============================================================
// MotoTrack — Back-jobs data
// Split from backjobs.js. Behavior unchanged.
// ============================================================

function mechanicKey(job) {
    return (job.mechanic_name || '').trim() || 'Unassigned';
}

function isOpenClaim(job) {
    return job.stage !== 'Release';
}

function sortBackjobs(jobs) {
    return [...jobs].sort((a, b) => {
        const openDelta = Number(isOpenClaim(b)) - Number(isOpenClaim(a));
        if (openDelta !== 0) return openDelta;
        const byDate = String(a.date_in || '').localeCompare(String(b.date_in || ''));
        const dated = backjobSort === 'oldest' ? byDate : -byDate;
        return dated !== 0 ? dated : Number(b.id) - Number(a.id);
    });
}

function backjobMatches(job, q) {
    if (!q) return true;
    return [
        job.plate_number, job.customer, job.moto_model,
        job.complaint, job.mechanic_name,
    ].join(' ').toLowerCase().includes(q.toLowerCase());
}

function jobsForMechanic(name, pool) {
    const key = String(name || '').trim();
    return pool.filter(job => mechanicKey(job) === key);
}

function mostCommon(values) {
    const counts = {};
    values.forEach(value => {
        const key = String(value || '').trim();
        if (!key) return;
        counts[key] = (counts[key] || 0) + 1;
    });
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b))[0] || '';
}

function mechanicRows(jobs) {
    const names = [];
    const seen = {};
    jobs.forEach(job => {
        const name = mechanicKey(job);
        if (seen[name]) return;
        seen[name] = true;
        names.push(name);
    });

    return names
        .map(name => {
            const theirs = jobsForMechanic(name, jobs);
            const allTheirs = jobsForMechanic(name, allShopJobs());
            const total = allTheirs.length;
            const claims = allTheirs.filter(job => job.is_warranty_claim).length;
            const qualityPct = total > 0 ? ((total - claims) / total) * 100 : null;
            const root = mostCommon(theirs.map(job => job.complaint));
            const part = mostCommon(theirs.flatMap(job => (
                job.specs ? consumablesOf(job.specs).map(line => line.name) : []
            )));
            let status = { cls: 'green', label: 'Closed' };
            if (theirs.some(job => job.stage === 'QA' || job.stage === 'Tuning')) {
                status = { cls: 'yellow', label: 'Re-testing' };
            } else if (theirs.some(job => isOpenClaim(job))) {
                status = { cls: 'orange', label: 'Open' };
            }
            const rated = theirs.filter(job => Number(job.rating) >= 1 && Number(job.rating) <= 5);
            const ratingAvg = rated.length
                ? rated.reduce((sum, job) => sum + Number(job.rating), 0) / rated.length
                : null;
            return {
                name,
                count: theirs.length,
                root: root || 'No complaint logged',
                part,
                qualityPct,
                ratingAvg,
                ratingCount: rated.length,
                status,
            };
        })
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function monthStamp(offset = 0) {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthClaimRate(stamp) {
    const monthJobs = allShopJobs().filter(job => String(job.date_in || '').startsWith(stamp));
    if (monthJobs.length === 0) return 0;
    return (monthJobs.filter(job => job.is_warranty_claim).length / monthJobs.length) * 100;
}

function backjobKpis() {
    const monthRate = monthClaimRate(monthStamp(0));
    const lastRate = monthClaimRate(monthStamp(-1));
    const active = backjobRows.filter(isOpenClaim).length;
    const partsCost = backjobRows.reduce((sum, job) => sum + Number(job.specs?.partsCost || 0), 0);
    return { active, monthRate, lastRate, partsCost };
}

function filteredBackjobPool() {
    let jobs = backjobRows.filter(job => backjobMatches(job, backjobSearch));
    if (backjobMechanic) {
        jobs = jobs.filter(job => mechanicKey(job) === backjobMechanic);
    }
    const counts = {
        open: jobs.filter(isOpenClaim).length,
        closed: jobs.filter(job => !isOpenClaim(job)).length,
    };
    counts.all = jobs.length;
    if (backjobStatus === 'open') jobs = jobs.filter(isOpenClaim);
    if (backjobStatus === 'closed') jobs = jobs.filter(job => !isOpenClaim(job));
    return { jobs: sortBackjobs(jobs), counts };
}
