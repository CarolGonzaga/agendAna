export const CATEGORIES = ['Trabalho', 'Projeto', 'Rotina', 'Saúde', 'Casa', 'Pessoal', 'Lazer', 'Outro'];

export const CATEGORY_COLORS = {
    Trabalho: '#8E7CC3',
    Projeto: '#C98FAE',
    Rotina: '#7E8CA0',
    Saúde: '#8FB99A',
    Casa: '#C9A86A',
    Pessoal: '#B98DB6',
    Lazer: '#D4A85A',
    Outro: '#9E94A8',
    Livre: '#C9C2D6',
    Recompensa: '#D4A85A',
};

export function categoryColor(cat) {
    return CATEGORY_COLORS[cat] || CATEGORY_COLORS.Outro;
}

export const AVATAR_ICONS = [
    'moon',
    'gem',
    'wand',
    'crown',
    'book',
    'flame',
    'heart',
    'flower',
    'shield',
    'feather',
    'cat',
    'compass',
];