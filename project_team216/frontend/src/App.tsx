import React, { useRef, useState } from 'react';
import MapComponent from './components/Map/MapComponent';
import RoomShowcase from './components/RoomShowcase/RoomShowcase';
import BuildingList from './components/BuildingList/BuildingList';
import FileUploader from './components/FileUploader/FileUploader';
import { Room } from './types/rooms';
import { Building } from './types/buildings';
import {
	Typography,
	Paper,
	Box,
	IconButton,
	Fade,
	SpeedDial,
	SpeedDialAction,
	SpeedDialIcon,
	Dialog,
	DialogContent,
	DialogTitle,
	Slide,
	Tabs,
	Tab
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { ThemeProvider, createTheme, styled } from '@mui/material/styles';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LayersIcon from '@mui/icons-material/Layers';
import CloseIcon from '@mui/icons-material/Close';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ApartmentIcon from '@mui/icons-material/Apartment';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';

interface RoomShowcaseRef {
	setSelectedSection: (section: 'selected' | 'available' | 'relationships') => void;
}

const Transition = React.forwardRef(function Transition(
	props: TransitionProps & {
		children: React.ReactElement<any, any>;
	},
	ref: React.Ref<unknown>,
) {
	return <Slide direction="up" ref={ref} {...props} />;
});

const StyledSpeedDial = styled(SpeedDial)(() => ({
	'& .MuiSpeedDial-fab': {
		backgroundColor: 'rgba(36, 36, 36, 0.5)',
		backdropFilter: 'blur(8px)',
		'&:hover': {
			backgroundColor: 'rgba(36, 36, 36, 0.7)',
		}
	}
}));

const SlidingPanel = styled(Box)(({ theme }) => ({
	position: 'absolute',
	right: 0,
	top: '5%',
	height: '90%',
	transition: 'transform 0.5s ease-in-out',
	display: 'flex',
	flexDirection: 'column',
	pointerEvents: 'auto',
	paddingRight: '1%',
}));

const RotatingIconButton = styled(IconButton)(({ theme }) => ({
	position: 'fixed',
	right: 'calc(33.33% - 20px)',
	top: '50%',
	transform: 'translateY(-50%)',
	backgroundColor: 'rgba(36, 36, 36, 0.5)',
	backdropFilter: 'blur(8px)',
	'&:hover': {
		backgroundColor: 'rgba(36, 36, 36, 0.7)',
	},
	zIndex: 2000,
	width: 40,
	height: 40,
	pointerEvents: 'auto',
}));

const RotatingIcon = styled(Box)(({ theme }) => ({
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	transition: 'transform 0.5s ease-in-out',
}));

const GlassTabs = styled(Tabs)(({ theme }) => ({
	backgroundColor: 'rgba(0, 0, 0, 0.3)',
	backdropFilter: 'blur(8px)',
	borderRadius: '12px',
	minHeight: 40,
	'& .MuiTab-root': {
		minHeight: 40,
		textTransform: 'none',
		fontSize: '0.9rem',
		color: 'rgba(255, 255, 255, 0.7)',
		'&.Mui-selected': {
			color: 'rgba(255, 255, 255, 0.9)',
		}
	}
}));

const darkTheme = createTheme({
	palette: {
		mode: 'dark',
		primary: {
			main: '#90caf9',
		},
		background: {
			paper: 'rgba(0, 0, 0, 0.8)',
		}
	},
	components: {
		MuiDialog: {
			styleOverrides: {
				paper: {
					backgroundColor: 'rgba(36, 36, 36, 0.95)',
					backdropFilter: 'blur(8px)',
					borderRadius: '24px',
				}
			}
		},
		MuiPaper: {
			styleOverrides: {
				root: {
					backgroundColor: 'rgba(0, 0, 0, 0.8)',
					backdropFilter: 'blur(8px)',
					borderRadius: '16px',
				}
			}
		},
		MuiTab: {
			styleOverrides: {
				root: {
					fontSize: '0.875rem',
					minHeight: 40,
					fontWeight: 500,
					'&.Mui-selected': {
						color: '#90caf9',
					}
				}
			}
		}
	}
});

const App = () => {
	const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
	const [selectedRooms, setSelectedRooms] = useState<Room[]>([]);
	const [buildings, setBuildings] = useState<Building[]>([]);
	const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
	const [showUploader, setShowUploader] = useState(false);
	const [showSidebar, setShowSidebar] = useState(true);
	const [activeTab, setActiveTab] = useState<'buildings' | 'rooms'>('buildings');
	const roomShowcaseRef = useRef<RoomShowcaseRef>(null);

	// Fetch buildings data when component mounts
	React.useEffect(() => {
		const fetchBuildingData = async () => {
			try {
				const response = await fetch('http://localhost:4321/query', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						WHERE: {},
						OPTIONS: {
							COLUMNS: [
								"rooms_fullname",
								"rooms_shortname",
								"rooms_address",
								"rooms_lat",
								"rooms_lon"
							],
							ORDER: { dir: "UP", keys: ["rooms_shortname"] }
						}
					})
				});

				if (!response.ok) throw new Error('Failed to fetch building data');

				const data = await response.json();
				const uniqueBuildings = Array.from(new Set(data.result.map((item: any) => item.rooms_shortname)))
					.map(shortname => {
						const buildingData = data.result.find((item: any) => item.rooms_shortname === shortname);
						return {
							fullname: buildingData.rooms_fullname,
							shortname: buildingData.rooms_shortname,
							address: buildingData.rooms_address,
							lat: buildingData.rooms_lat,
							lon: buildingData.rooms_lon
						};
					});

				setBuildings(uniqueBuildings);
			} catch (error) {
				console.error('Error fetching building data:', error);
			}
		};

		fetchBuildingData();
	}, []);

	const handleRoomsSelect = (rooms: Room[]) => {
		setAvailableRooms(rooms);
		setActiveTab('rooms');
		setShowSidebar(true);
	};

	const handleBuildingSelect = async (building: Building | null) => {
		setSelectedBuilding(building);
		if (building) {
			try {
				const response = await fetch('http://localhost:4321/query', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						WHERE: { IS: { rooms_shortname: building.shortname } },
						OPTIONS: {
							COLUMNS: [
								"rooms_fullname",
								"rooms_shortname",
								"rooms_number",
								"rooms_address",
								"rooms_seats",
								"rooms_type",
								"rooms_furniture",
								"rooms_lat",
								"rooms_lon"
							],
							ORDER: { dir: "UP", keys: ["rooms_number"] }
						}
					})
				});

				if (!response.ok) throw new Error('Failed to fetch rooms for building');

				const data = await response.json();
				const rooms = data.result.map((item: any): Room => ({
					fullname: item.rooms_fullname,
					shortname: item.rooms_shortname,
					number: item.rooms_number,
					name: `${item.rooms_shortname} ${item.rooms_number}`,
					address: item.rooms_address,
					lat: item.rooms_lat,
					lon: item.rooms_lon,
					seats: item.rooms_seats,
					type: item.rooms_type,
					furniture: item.rooms_furniture,
					href: ''
				}));

				handleRoomsSelect(rooms);
			} catch (error) {
				console.error('Error fetching rooms:', error);
			}
		}
	};

	const handleRoomSelection = (rooms: Room[]) => {
		setSelectedRooms(rooms);
		if (roomShowcaseRef.current?.setSelectedSection) {
			roomShowcaseRef.current.setSelectedSection('selected');
		}
	};

	const clearSelectedRooms = () => {
		setSelectedRooms([]);
	};

	const toggleSidebar = () => {
		setShowSidebar(!showSidebar);
	};

	const actions = [
		{ icon: <UploadFileIcon />, name: 'Upload Dataset', action: () => setShowUploader(true) },
		{ icon: <LayersIcon />, name: 'Toggle Sidebar', action: toggleSidebar },
	];

	return (
		<ThemeProvider theme={darkTheme}>
			<Box sx={{ height: '100vh', width: '100vw', position: 'relative' }}>
				{/* Map Component */}
				<Box sx={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: '100%',
					height: '100%',
					zIndex: 1
				}}>
					<MapComponent
						onRoomsSelect={handleRoomsSelect}
						selectedRooms={selectedRooms}
						onSelectedRoomsChange={handleRoomSelection}
						selectedBuilding={selectedBuilding}
						onBuildingSelect={handleBuildingSelect}
					/>
				</Box>

				{/* UI Layer */}
				<Box sx={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: '100%',
					height: '100%',
					zIndex: 2,
					pointerEvents: 'none',
				}}>
					{/* SpeedDial */}
					<StyledSpeedDial
						ariaLabel="Navigation speed dial"
						sx={{
							position: 'absolute',
							bottom: 16,
							left: 16,
							pointerEvents: 'auto',
						}}
						icon={<SpeedDialIcon />}
					>
						{actions.map((action) => (
							<SpeedDialAction
								key={action.name}
								icon={action.icon}
								tooltipTitle={action.name}
								onClick={action.action}
							/>
						))}
					</StyledSpeedDial>

					{/* Toggle Button */}
					<RotatingIconButton
						onClick={toggleSidebar}
						sx={{
							right: showSidebar ? 'calc(33.33% + 25px)' : 5,
							transition: 'right 0.5s ease-in-out',
						}}
					>
						<RotatingIcon
							sx={{
								transform: showSidebar ? 'rotate(0deg)' : 'rotate(180deg)',
							}}
						>
							<ChevronRightIcon />
						</RotatingIcon>
					</RotatingIconButton>

					{/* Right Side Panel */}
					<SlidingPanel
						sx={{
							width: '33.33%',
							transform: showSidebar ? 'translateX(0)' : 'translateX(calc(100% + 16px))',
						}}
					>
						<Paper
							elevation={3}
							sx={{
								flex: 1,
								height: '100%',
								display: 'flex',
								flexDirection: 'column',
								backgroundColor: 'rgba(0, 0, 0, 0.7)',
								backdropFilter: 'blur(8px)',
								borderRadius: '24px',
								overflow: 'hidden',
							}}
						>
							{/* Navigation Tabs */}
							<Box sx={{ p: 2, pb: 1 }}>
								<GlassTabs
									value={activeTab}
									onChange={(_, newValue) => setActiveTab(newValue)}
									variant="fullWidth"
								>
									<Tab
										icon={<ApartmentIcon sx={{ fontSize: '1.1rem' }} />}
										iconPosition="start"
										label="Buildings"
										value="buildings"
									/>
									<Tab
										icon={<MeetingRoomIcon sx={{ fontSize: '1.1rem' }} />}
										iconPosition="start"
										label="Rooms"
										value="rooms"
									/>
								</GlassTabs>
							</Box>

							{/* Panel Content */}
							<Box sx={{
								flex: 1,
								overflow: 'hidden',  // Changed from 'auto' to 'hidden'
								display: 'flex',     // Added
								flexDirection: 'column' // Added
							}}>
								{activeTab === 'buildings' ? (
									<BuildingList
										buildings={buildings}
										onBuildingSelect={handleBuildingSelect}
										selectedBuilding={selectedBuilding}
									/>
								) : (
									<RoomShowcase
										ref={roomShowcaseRef}
										rooms={availableRooms}
										selectedRooms={selectedRooms}
										onRoomSelect={handleRoomSelection}
										onClearRooms={clearSelectedRooms}
									/>
								)}
							</Box>
						</Paper>
					</SlidingPanel>

					{/* FileUploader Dialog */}
					<Dialog
						open={showUploader}
						TransitionComponent={Transition}
						keepMounted
						onClose={() => setShowUploader(false)}
						aria-describedby="file-uploader-dialog"
						maxWidth="sm"
						fullWidth
					>
						<DialogTitle sx={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							pb: 1
						}}>
							<Typography variant="h6">Upload Dataset</Typography>
							<IconButton
								aria-label="close"
								onClick={() => setShowUploader(false)}
								sx={{
									color: 'grey.500',
									transition: 'all 0.2s',
									'&:hover': {
										transform: 'rotate(90deg)',
										color: 'error.main',
									}
								}}
							>
								<CloseIcon />
							</IconButton>
						</DialogTitle>
						<DialogContent>
							<FileUploader />
						</DialogContent>
					</Dialog>
				</Box>
			</Box>
		</ThemeProvider>
	);
};

export default App;