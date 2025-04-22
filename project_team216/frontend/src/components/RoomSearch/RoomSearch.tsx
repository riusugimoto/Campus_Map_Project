import { Autocomplete, TextField, Box, Typography, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import { Room } from '../../types/rooms';

const GlassAutocomplete = styled(Autocomplete)(({ theme }) => ({
	'& .MuiInputBase-root': {
		background: 'transparent',
		color: 'white',
		'& fieldset': { border: 'none' },
		height: '35px',
	},
	'& .MuiInputBase-input': {
		color: 'rgba(255, 255, 255, 0.9)',
		fontSize: '0.95rem',
		padding: '2px 8px !important',
		'&::placeholder': {
			color: 'rgba(255, 255, 255, 0.6)',
			opacity: 1
		}
	},
	'& .MuiAutocomplete-popupIndicator, & .MuiAutocomplete-clearIndicator': {
		color: 'rgba(255, 255, 255, 0.7)'
	},
	'& .MuiAutocomplete-paper': {
		backgroundColor: 'rgba(0, 0, 0, 0.8)',
		backdropFilter: 'blur(7px)',
		borderRadius: '12px',
		marginTop: '8px',
		border: '1px solid rgba(255, 255, 255, 0.1)',
	}
}));

interface RoomSearchProps {
	rooms: Room[];
	selectedRooms: Room[];
	onRoomSelect: (room: Room) => void;
}

const RoomSearch = ({ rooms, selectedRooms, onRoomSelect }: RoomSearchProps) => {
	const filterOptions = (options: Room[], { inputValue }: { inputValue: string }) => {
		const searchTerm = inputValue.trim().toLowerCase();
		if (!searchTerm) return options;

		return options.filter(room => {
			const fullCode = `${room.shortname} ${room.number}`.toLowerCase();
			return (
				room.shortname.toLowerCase().includes(searchTerm) ||
				fullCode.includes(searchTerm)
			);
		});
	};

	return (
		<GlassAutocomplete
			options={rooms}
			getOptionLabel={(option) => `${option["shortname"]} ${option["number"]}`}
			filterOptions={filterOptions}
			onChange={(_, value) => {
				if (value) {
					onRoomSelect(value);
				}
			}}
			renderInput={(params) => (
				<TextField
					{...params}
					placeholder="Search rooms (e.g., BIOL 2000)"
					InputProps={{
						...params.InputProps,
						startAdornment: <SearchIcon sx={{ mr: 1, color: 'rgba(255, 255, 255, 0.7)' }} />
					}}
					sx={{
						'& .MuiInputBase-root': {
							paddingLeft: 0
						}
					}}
				/>
			)}
			renderOption={(props, option) => (
				<li {...props}>
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
						<Typography color="white">
							{option["shortname"]} {option["number"]}
							{selectedRooms.some(
								r => r.shortname === option["shortname"] &&
									r.number === option["number"]
							) && (
								<Chip
									label="Selected"
									size="small"
									color="primary"
									sx={{ ml: 1 }}
								/>
							)}
						</Typography>
						<Typography variant="caption" color="rgba(255, 255, 255, 0.7)">
							{option["fullname"]}
						</Typography>
					</Box>
				</li>
			)}
		/>
	);
};

export default RoomSearch;
