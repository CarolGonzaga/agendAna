export const USER_IDS = {
    ANA: '0ab9972c-7535-4cf1-803c-8f7964add982',
    CAROL: '819f65ef-17c3-4e9a-a804-c56d5b5dbeeb',
};

export const APP_USERS = [
    {
        id: USER_IDS.ANA,
        name: 'Ana',
        shortName: 'Ana',
        role: 'Usuária Principal',
        avatar: 'moon',
    },
    {
        id: USER_IDS.CAROL,
        name: 'Carol',
        shortName: 'Carol',
        role: 'Usuária',
        avatar: 'gem',
    },
];

export function getUserById(id) {
    return APP_USERS.find((u) => u.id === id) || null;
}
