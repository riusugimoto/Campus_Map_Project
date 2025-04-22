import React, { useState } from 'react';
import {
	Box,
	Typography,
	List,
	ListItemButton,
	ListItemText,
	Card,
	Zoom,
	TextField,
	Chip,
	Stack
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ApartmentIcon from '@mui/icons-material/Apartment';
import { Building } from '../../types/buildings';

interface BuildingListProps {
	buildings: Building[];
	onBuildingSelect: (building: Building | null) => void;
	selectedBuilding: Building | null;
}

const GlassCard = styled(Card)(({ theme }) => ({
	background: 'rgba(0, 0, 0, 0.7)',
	backdropFilter: 'blur(10px)',
	WebkitBackdropFilter: 'blur(10px)',
	borderRadius: '16px',
	overflow: 'visible'
}));

const GlassTextField = styled(TextField)(() => ({
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
	}
}));

const AnimatedListItem = styled(ListItemButton)(({ theme }) => ({
	transition: 'all 0.2s ease-in-out',
	borderRadius: 8,
	marginBottom: 8,
	backgroundColor: 'rgba(50, 50, 50, 0.8)',
	'&:hover': {
		transform: 'translateY(-2px)',
		backgroundColor: 'rgba(66, 66, 66, 0.9)',
	},
	'&.Mui-selected': {
		backgroundColor: 'rgba(144, 202, 249, 0.2)',
		'&:hover': {
			backgroundColor: 'rgba(144, 202, 249, 0.3)',
		}
	}
}));

const BuildingList: React.FC<BuildingListProps> = ({
													   buildings,
													   onBuildingSelect,
													   selectedBuilding,
												   }) => {
	const [searchTerm, setSearchTerm] = useState('');

	const filteredBuildings = buildings.filter(
		(building) =>
			building.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
			building.shortname.toLowerCase().includes(searchTerm.toLowerCase())
	);

	return (
		<Box sx={{
			display: 'flex',
			flexDirection: 'column',
			height: '100%',
			maxHeight: '100%',
		}}>
			{/* Fixed Header Section */}
			<Box sx={{ px: 2, pt: 2, pb: 1 }}>
				<Typography variant="h5" sx={{ color: 'white', mb: 2 }}>
					Campus Buildings
				</Typography>

				<GlassCard sx={{ p: 2, mb: 2 }}>
					<GlassTextField
						fullWidth
						placeholder="Search buildings..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						InputProps={{
							startAdornment: <SearchIcon sx={{ mr: 1, color: 'rgba(255, 255, 255, 0.7)' }} />
						}}
					/>
				</GlassCard>
			</Box>

			{/* Scrollable List Section */}
			<Box sx={{
				flex: 1,
				overflowY: 'auto',
				px: 2,
				pb: 2
			}}>
				<List disablePadding>
					{filteredBuildings.map((building, index) => (
						<Zoom
							in
							key={`${building.shortname}-${index}`}
							style={{ transitionDelay: `${index * 30}ms` }}
						>
							<AnimatedListItem
								selected={selectedBuilding?.shortname === building.shortname}
								onClick={() => onBuildingSelect(building)}
							>
								<ListItemText
									primary={
										<Typography variant="body1" color="white">
											{building.shortname}
										</Typography>
									}
									secondary={
										<Stack spacing={1} sx={{ mt: 1 }}>
											<Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
												{building.fullname}
											</Typography>
											<Box sx={{ display: 'flex', gap: 1 }}>
												<Chip
													icon={<ApartmentIcon />}
													label={building.shortname}
													size="small"
													sx={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
												/>
												<Chip
													icon={<LocationOnIcon />}
													label="View on Map"
													size="small"
													sx={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
												/>
											</Box>
										</Stack>
									}
								/>
							</AnimatedListItem>
						</Zoom>
					))}
				</List>
			</Box>
		</Box>
	);
};

export default BuildingList;
