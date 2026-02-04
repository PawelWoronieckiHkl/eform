function customOrgSorting(organizations) {
    const priority = [
        'HKL',
        'Cozy',
        'LUXANGMBH',
        'LUXAN_EWA_KRAWCZYK',
        'REMASUN',
        'FENIX',
    ]
    const sortedOrgs = [];
    let idx = 0;
    for (let org of priority) {
        organizations.forEach(element => {
            if (element.ident === org) {
                console.log('org', org)
                sortedOrgs.push(element);
                
            }
        });
    }
    console.log('Sorted Orgs:', sortedOrgs);
    return sortedOrgs;
}







module.exports = { customOrgSorting };