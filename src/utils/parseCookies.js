export const parseCookies = (data) => {
	const getValue = (str, key) => {
		const match = str.match(new RegExp(`${key}=([^;]+)`));
		return match ? match[1] : null;
	};

	const ltmid_v2 = getValue(data, 'ltmid_v2');
	const ltoken_v2 = getValue(data, 'ltoken_v2');
	const ltuid_v2 = getValue(data, 'ltuid_v2');
	const mi18nLang = getValue(data, 'mi18nLang');

	return {
		ltmid_v2: ltmid_v2,
		ltoken_v2: ltoken_v2,
		ltuid_v2: ltuid_v2,
		mi18nLang: mi18nLang,
		account_id_v2: ltuid_v2,
		account_mid_v2: ltmid_v2,
	};
};