import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import postcss from 'rollup-plugin-postcss';

export default {
	input: 'datavis.js',
	output: {
		file: 'dist/wcdatavis.js',
		format: 'iife',
		globals: {
			fs: 'undefined',
			stream: 'undefined',
		}
	},
	plugins: [
		resolve(),
		commonjs(),
		postcss({
			extract: true
		}),
		babel({
			babelHelpers: 'bundled'
		})]
};
